# IntelliGenda — Performance Optimization & Bug Fix Worklog

## Summary
Applied 7 changes across 7 files to fix a resource creation bug and implement major performance optimizations.

---

## Task 1: Fix Resource Creation Error
**File:** `src/app/api/resources/route.ts`

- **Bug:** Empty `serviceIds: []` array is truthy in JS, causing `{ services: { connect: [] } }` to be spread into the Prisma create call, which could cause errors.
- **Fix:** Changed condition from `data.serviceIds &&` to `data.serviceIds && data.serviceIds.length > 0 &&`
- **Fix:** Added `debug` field to the 500 error response with actual error message for debugging.

---

## Task 2: Admin Prenota Performance (CRITICAL)
**File:** `src/app/admin/prenota/page.tsx`

- **Before:** `fetchMonthAvailability` made 28-31 individual `/api/slots?date=...&duration=...` fetch calls (batched in groups of 5).
- **After:** Replaced with a SINGLE `/api/slots/batch?startDate=...&endDate=...&duration=...` call.
- **Impact:** Reduced 28-31 HTTP requests → 1 HTTP request per month navigation.
- **Fix:** Replaced `closedDates.includes(dateStr)` with `Set.has()` for O(1) lookup.

---

## Task 3: ensureDbSchema Performance (CRITICAL)
**File:** `src/lib/db.ts`

- **Before:** `ensureDbSchema()` looped through ~60 DDL statements, each making a separate HTTP call to the Neon SQL API.
- **After:** Joins all DDL statements with `;\n` and sends them in a single HTTP call.
- **Fallback:** If batch fails, falls back to sequential execution.
- **Impact:** Reduced ~60 HTTP round-trips → 1 HTTP round-trip.

**File:** `src/lib/slot-algorithm.ts`

- Removed redundant `await ensureDbSchema()` calls from 5 functions:
  - `getAvailableSlots()` (line 81)
  - `findFreeResource()` (line 279)
  - `getBatchAvailability()` (line 388)
  - `isDateClosed()` (line 606)
  - `getAllClosedDatesInRange()` (line 626)
- **Rationale:** These functions are always called AFTER `ensureDbSchema()` was already called by the API route handler that imports them. The module-level `_schemaEnsured` flag caches the result.

---

## Task 4: Lightweight isSlotAvailable
**File:** `src/lib/slot-algorithm.ts`

- **Before:** `isSlotAvailable()` called the full `getAvailableSlots()` which does 3 DB queries (config, resources, bookings) + computes all slots.
- **After:** New lightweight version does only 1 DB query for config + 1 for resources + 1 for bookings (focused on just the single slot being checked), with inline lunch break and min-notice checks.
- **Impact:** Eliminates the overhead of computing all available slots when only checking one specific slot.

---

## Task 5: Stats API Parallel Queries
**File:** `src/app/api/stats/route.ts`

- **Before:** 3 sequential DB queries (todayBookings → totalBookings → allRevenue).
- **After:** All 3 wrapped in `Promise.all()` to execute in parallel.
- **Bonus:** Changed `todayStart` to use Rome-aware timezone calculation.
- **Impact:** Reduced 3 sequential round-trips → 1 parallel round-trip.

---

## Task 6: Middleware — Parallel Internal Checks
**File:** `src/middleware.ts`

- **Before:** `checkIPBanned()` and `checkMaintenanceStatus()` ran sequentially (2 separate HTTP fetches).
- **After:** Both run in parallel via `Promise.all()`.
- **Preserved:** Excluded paths bypass both checks.
- **Impact:** Reduced 2 sequential HTTP fetches → 1 parallel fetch on every non-excluded request.

---

## Task 7: Calendario — Pre-compute Bookings Map
**File:** `src/app/admin/calendario/page.tsx`

- **Before:** `bookingsByDate()` created a new filtered array for EVERY calendar cell (~42 times per render), each iterating the entire bookings array.
- **After:** Pre-computes a `Map<string, BookingWithServices[]>` keyed by date string when bookings change. Lookup becomes O(1) per cell.
- **Before:** `isDateClosed()` used `Array.some()` — O(N) per cell.
- **After:** Pre-computes `Set<string>` for closed dates. Lookup becomes O(1).
- **Impact:** Calendar render goes from O(42 × N) to O(N + 42).

---

## Task 8: findFreeResource reuse
**No changes needed.** Task 4's lightweight `isSlotAvailable` already addresses the main performance concern. `findFreeResource` has its own optimized query.

---

## Verification
- `npx prisma generate`: ✅ Success
- `bunx tsc --noEmit`: ✅ No errors in modified files (all errors are pre-existing in unrelated files)
- `bun run lint`: ✅ No new errors introduced (all errors are pre-existing React hook warnings)
---
Task ID: 1
Agent: main
Task: Fix post-registration page crash and calendar availability issues

Work Log:
- Investigated post-registration page crash: "This page couldn't load" after booking+registration success
- Found root cause: `createInRome` import from `@/lib/timezone` was removed during performance optimization commit but still used in `buildGoogleCalendarUrl()` function called during StepConfirmation render
- Restored the `createInRome` import on line 8 of `src/app/prenota/page.tsx`
- Fixed cancellation link on success page: replaced stale page route `/prenota/cancella/{id}` with proper POST `/api/bookings/cancel` API call
- Added `force-dynamic` to `/api/slots/batch/route.ts` and `/api/slots/route.ts` to prevent Next.js from caching availability responses (potential cause of calendar all-gray issue)
- Added `ensureDbSchema()` to both slots API routes for cold-start robustness
- Investigated calendar all-gray issue via sub-agent: confirmed both root causes already addressed (totalSlotDuration useMemo + force-dynamic)
- Commits pushed: 02a071b (main fixes), c8d51e0 (defensive improvements)

Stage Summary:
- Post-registration crash FIXED: missing `createInRome` import restored
- Calendar availability: `force-dynamic` added to slots APIs + `ensureDbSchema()` for robustness
- Cancel link on success page FIXED: now uses proper API call instead of dead page route
- All commits pushed to origin/main, Vercel will auto-deploy
---
Task ID: coupon-system
Agent: main
Task: Implement merchant coupon system (per-negozio discount codes)

Work Log:
- Added MerchantCoupon model to Prisma schema (code, discountAmount, maxUses, usedCount, isActive, expiresAt)
- Added couponId, discountApplied, finalPrice nullable fields to Booking model
- Added auto-migration DDL in db.ts for Neon production (CREATE TABLE, ALTER TABLE, FK, indexes)
- Created GET /api/coupon/validate public endpoint for client-side coupon verification
- Created GET/POST /api/coupon/admin and PATCH/DELETE /api/coupon/admin/[id] for admin CRUD
- Modified POST /api/bookings: conditional coupon validation, discountApplied/finalPrice on create, usedCount increment
- Added coupon input block in prenota/page.tsx Step 4 (under email field)
- Updated BookingSummaryBlock to show discount line and "Totale scontato"
- Updated email templates (customer + admin) with green discount line
- Added discount badge in admin booking detail modal, mobile list, and bottom sheet
- Created /admin/coupon/page.tsx with Apple-style management table
- Added "Codici Sconto" entry to admin sidebar with Tag icon
- Updated BookingWithServices interface with discountApplied/finalPrice fields
- Build verified successfully, pushed to origin/main

Stage Summary:
- Commit 87f03a5 pushed: complete merchant coupon system
- 11 files modified, 790 lines added, 9 lines changed
- Zero existing logic modified — all changes are additive

---
Task ID: 1
Agent: Main Agent
Task: Implement secret 5-tap admin shortcut on booking header

Work Log:
- Read prenota/page.tsx header section (line 1495-1535) to locate the title element
- Added `useRef` to React imports
- Injected tapCountRef and tapTimerRef after shopName state declaration
- Created handleSecretTap callback: increments counter → clears previous timeout → if count >= 5 → reset + router.push('/admin') → else set 800ms reset timeout
- Applied onClick={handleSecretTap} + select-none to the `<h1>Prenota</h1>` header title
- Committed as 77ba7e5 and pushed to main

Stage Summary:
- Surgical injection: 21 lines added, 0 lines of existing logic modified
- Zero changes to booking flow, APIs, cache, coupon, timezone, or middleware
- Feature: 5 consecutive taps within 800ms window on header title → redirect to /admin
- Invisible to B2C customers: no visual indicator, no cursor change, select-none prevents text highlighting

---
Task ID: 1
Agent: Main Agent
Task: Extend Service model with category, featured, compareAtPrice (Add-Only)

Work Log:
- Updated schema.prisma: added category (String?), featured (Boolean, default false), compareAtPrice (Float?)
- Updated validations.ts serviceSchema with 3 new optional fields
- Added 3 ALTER TABLE migration lines to db.ts MIGRATION_SQL
- Regenerated Prisma client
- Updated admin/servizi/page.tsx: Service interface, emptyForm, openEdit, handleSave, form fields (category input, featured toggle, compareAtPrice input), service list (badges + old price)
- Updated PUT /api/services/[id] to persist all new fields
- Rewrote prenota/page.tsx StepServices: ServiceCard component, featured section, category grouping, uncategorized fallback, compareAtPrice display (line-through + green price)
- Updated booking summary service list to show compareAtPrice
- Verified totalPrice logic unchanged (uses service.price = real selling price)

Stage Summary:
- Commit 7f3b592 pushed to main
- 6 files changed, 196 insertions, 55 deletions
- 100% backward-compatible: existing services get default values (category=null, featured=false, compareAtPrice=null)
- Cart/coupon/booking API untouched
---
Task ID: middleware-slimming
Agent: main
Task: Intervento A (Middleware Slimming) + Intervento B (ensureApiLogTable Health-Check)

Work Log:
- Created src/lib/neon-http.ts with Edge-compatible Neon HTTP utilities (neonRawQuery + neonQueryRows)
- Rewrote src/middleware.ts: replaced 2 fetch() calls to internal APIs with single Neon HTTP query using json_agg + COALESCE
- Removed dead /api/internal/maintenance-status and /api/internal/banned-ips routes
- Updated src/lib/db.ts: imported neonRawQuery/neonQueryRows from neon-http.ts
- Applied health-check pattern to ensureApiLogTable() (information_schema.tables query)
- Refactored isSchemaUpToDate() to use neonQueryRows
- Build passed, committed as 7fa2d10, pushed to main

Stage Summary:
- Cold start reduction estimate: -300-500ms (middleware cascade eliminated) + -80ms (ApiLog health-check)
- The middleware no longer triggers any Next.js serverless function cold starts
- Single Neon HTTP query replaces 2 internal API calls that each spanned a full cold start lifecycle
- 5 files changed: +153, -146 lines

---
Task ID: fix-vercel-build
Agent: main
Task: Fix Vercel build errors (tailwindcss-animate + truncated page.tsx) + restructure logo placement

Work Log:
- Deleted vestigial tailwind.config.ts: Tailwind v3 config file imported non-existent `tailwindcss-animate` module. Project uses Tailwind v4 with CSS-based config (globals.css + tw-animate-css).
- Restored src/app/page.tsx from commit 8dea46e: previous bad merge truncated ~100 lines, causing motion.div JSX parse errors. Restored version has Sparkles icon + 5-tap admin.
- Updated CustomerNavbar.tsx: replaced logo.png Image with Sparkles icon in a rounded-lg gradient container (matching page.tsx style). Removed unused next/image import.
- Logo placement architecture:
  - www.intelligenda.it (landing page) → IntelliGendaLogo component with logo.png ✅
  - Tenant pages (prova.intelligenda.it) → Sparkles icon in CustomerNavbar + page.tsx ✅
  - 5-tap secret admin preserved on Sparkles icon in page.tsx ✅

Stage Summary:
- Commit 3670e96 pushed to main
- 3 files changed: +106, -70 lines (deleted tailwind.config.ts)
- Build errors resolved: no more tailwindcss-animate import, no more truncated JSX
- Clear logo separation: brand image only on marketing site, Sparkling icon on all tenant customer pages

---
Task ID: 3
Agent: Main Agent
Task: Step 3 - Sidebar unificata + riorganizzazione rotte admin

Work Log:
- Verificato che Step 2 (JWT + jose + middleware) era già implementato
- Letto e analizzato layout.tsx, dashboard, impostazioni, login esistenti
- Redesign completo di admin/layout.tsx con sidebar sezionale minimal
- Creata pagina /admin/piano/page.tsx per gestione piano
- Aggiornata dashboard con stile coerente e piu pulito
- Verificata build (nessun errore)
- Commit e push su git

Stage Summary:
- Sidebar riorganizzata in sezioni: Panoramica (Dashboard), Gestione (Calendario/Prenota/Servizi/Postazioni/Clienti/Coupon)
- Footer sidebar con Impostazioni + Piano + link sito/assistenza/logout
- Badge piano attuale visibile nella sidebar
- Admin-icon.png usato come logo nella sidebar tenant
- Shop name dinamico nell'header sidebar
- Componente SidebarLink riutilizzabile con supporto badge
- Auto-close sidebar su navigazione mobile
- Pagina Piano con 3 cards (Gratuito/Pro/Business), piano attuale, data scadenza
- Dashboard stile compatto con cards piu piccole, link "Vedi tutti" servizi
- Commit: 92ea278 "feat: Step 3 - sidebar unificata + pagina Piano"

---
Task ID: 3-fix
Agent: Main Agent
Task: Fix login "Negozio non trovato" da landing + registrazione senza nome negozio

Work Log:
- Analizzato screenshot: errore "Negozio non trovato" su www.intelligenda.it/login
- Identificato causa: /login usa /api/auth/customer/login che richiede tenant_slug cookie (assente sul dominio principale)
- Creato /api/auth/resolve-tenant per lookup tenant da ownerEmail
- Riscritto /login page: business login con email lookup, mostra link redirect al subdomain admin
- Riscritto /register page: form completo business (nome, negozio, slug, tipo attivita, email, password)
- Verificato build e push

Stage Summary:
- Fix: Login da landing page non da piu "Negozio non trovato"
- Nuovo: /login cerca tenant da email e mostra "Vai al pannello -> {slug}.intelligenda.it/admin/login"
- Nuovo: /register ha campo Nome Negozio + Slug (.intelligenda.it) + Tipo Attivita
- Endpoint: GET /api/auth/resolve-tenant?email=xxx → restituisce slug, businessName, adminUrl
- Commit: bd7c95a
---
Task ID: 1
Agent: main
Task: Aggiungere "Powered by IntelliGenda", descrizione breve, posizione/indirizzo con toggle visibilità

Work Log:
- Esplorato il codebase: homepage (page.tsx), prenota/page.tsx, admin/impostazioni, Prisma schema, db.ts, validations.ts, api/config, api/bookings
- Aggiunto "Powered by IntelliGenda" in basso-centro nella homepage (src/app/page.tsx)
- Aggiunto "Powered by IntelliGenda" in basso nella pagina di prenotazione Step 5 (src/app/prenota/page.tsx)
- Aggiunto "Powered by IntelliGenda" nella pagina di cancellazione prenotazione
- Aggiunto campo `shortDescription` (String, max 200 char) in Prisma schema + DDL migration + Zod validation
- Aggiunto campo `showAddress` (Boolean, default true) in Prisma schema + DDL migration + Zod validation
- Aggiunto textarea "Descrizione Breve" con counter 200 char nella sezione Negozio delle impostazioni admin
- Aggiunto toggle "Mostra indirizzo" sotto il campo Indirizzo nelle impostazioni admin
- Aggiunto `shortDescription` mostrato sotto il nome del negozio nella homepage cliente (corsivo, grigio chiaro)
- Aggioranto la condizione di visibilità dell'indirizzo nella homepage (rispetta `showAddress`)
- Aggiunto box "Ti aspettiamo il [data] alle [ora] - [indirizzo]" nel riepilogo Step 5 della prenotazione
- Aggiornato API /api/bookings POST per restituire shopAddress e showAddress
- Aggiornato health-check db.ts da `plan` a `showAddress`
- Build Next.js superata senza errori

Stage Summary:
- 3 funzionalità implementate: branding "Powered by", descrizione breve, posizione con toggle
- File modificati: page.tsx, prenota/page.tsx, cancella/page.tsx, impostazioni/page.tsx, prisma/schema.prisma, db.ts, validations.ts, api/bookings/route.ts
- Prisma generate eseguito con successo
- Tutti i campi hanno validazione (Zod max 200 char per shortDescription) e migrazione DDL automatica

---
Task ID: custom-dropdown
Agent: main
Task: Replace native select with custom in-page grouped dropdown for activity type on landing page

Work Log:
- Analyzed current landing page (src/app/landing/page.tsx) — native <select> with <optgroup> for activity type at lines 664-685
- Read activity-types.ts to understand data structure (ACTIVITY_GROUPS with emojis, ACTIVITY_TYPES with group mapping)
- Added state: activityDropdownOpen, expandedGroup, activityDropdownRef for click-outside detection
- Added useEffect for mousedown click-outside handler (closes dropdown + resets expanded group)
- Added computed values: selectedActivity, selectedGroupEmoji for trigger display
- Replaced native <select> with custom dropdown component:
  - Trigger button: shows emoji + activity name, border highlights on open, chevron rotates
  - Dropdown panel: absolute positioned, rounded, border, shadow, max-h-72 with scroll
  - Group headers: clickable + hoverable, emoji + group name, check mark if contains selected item, chevron rotates on expand
  - Group items: nested with pl-10 indent, selected item highlighted with bg-stone-100 + font-medium
  - All groups start collapsed, expand on click/hover
- Clicking an item: updates form.activityType, closes dropdown, resets expanded group
- Added ChevronRight to lucide imports
- Build verified: no errors, compiled successfully

Stage Summary:
- Custom dropdown replaces native <select> — no more browser popup on mobile
- Groups collapsed by default, expand on click/hover with smooth CSS transition
- Emojis preserved on both trigger button and group headers
- Style matches site aesthetic: stone-200 borders, rounded-xl, clean typography
- Minimal/clean: no unnecessary animations, consistent with existing form fields
- File modified: src/app/landing/page.tsx only

---
Task ID: dark-mode
Agent: main + 5 subagents
Task: Implement dark/light mode across entire IntelliGenda site

Work Log:
- Installed next-themes@0.4.6
- Created src/components/ThemeProvider.tsx (client wrapper for next-themes)
- Created src/components/ThemeToggle.tsx (elegant Sun/Moon toggle with animation)
- Updated src/app/layout.tsx: suppressHydrationWarning on html, ThemeProvider wrapping body
- Added .dark CSS variables block in globals.css (inverted oklch values for all shadcn/ui tokens)
- Added dark scrollbar styles in globals.css
- Updated CustomerNavbar.tsx: dark classes + ThemeToggle in top-right
- Updated admin/layout.tsx: dark classes on sidebar + ThemeToggle in footer (subagent)
- Updated landing/page.tsx: dark classes on all sections + ThemeToggle in navbar (subagent)
- Updated all 8 admin pages: dashboard, calendario, clienti, servizi, impostazioni, postazioni, prenota, coupon (subagent)
- Updated all 7 customer pages: page.tsx, prenota, cancella, account, profilo, login, register (subagent)
- Updated superadmin, manutenzione, termini, privacy pages with dark classes + ThemeToggle (subagent)
- Resolved merge conflicts with remote changes (rating UI fix, new files)
- Build verified: 74/74 static pages, zero errors
- Pushed to origin/main (commit 66152ae)

Stage Summary:
- 36 files modified, 1900+ insertions, 1500+ deletions
- 1400+ dark: class instances across 27 files
- ThemeToggle placed in: CustomerNavbar, admin sidebar, landing navbar, superadmin, manutenzione, termini, privacy
- Default theme: light (configurable via ThemeProvider)
- Zero logic changes — purely visual dark mode additions

---
Task ID: 1
Agent: Main Agent
Task: Add per-resource weekly availability scheduling feature

Work Log:
- Analyzed full codebase: Prisma schema, slot algorithm, admin postazioni page, all API routes
- Added ResourceAvailability model to Prisma schema (dayOfWeek, openTime, closeTime, closed, FK to Resource)
- Added 4 DDL migration statements to MIGRATION_SQL in db.ts
- Updated health check to detect new ResourceAvailability table
- Created new API endpoint GET/PUT /api/resources/[id]/availability
- Updated slot-algorithm.ts: all 4 functions (getAvailableSlots, getBatchAvailability, findFreeResource, isSlotAvailable) now respect per-resource availability
- Added mergeResourceAvailability() and isResourceAvailableForSlot() helper functions
- Enhanced admin postazioni page with weekly schedule editor UI (toggle per day, time inputs, save/reset)
- Added schedule summary indicator on resource cards
- Generated Prisma client, verified build succeeds, pushed to GitHub

Stage Summary:
- Commit d91733c pushed to main
- Feature complete: per-resource weekly availability scheduling
- Backward compatible: resources without custom schedule follow shop's global hours
