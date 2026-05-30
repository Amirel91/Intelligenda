---
Task ID: 1
Agent: Main Agent
Task: Add QR Code for shop window (vetrina) in admin settings Negozio tab

Work Log:
- Explored admin settings page structure (`src/app/admin/impostazioni/page.tsx`)
- Identified 4 tabs: negozio, orari, postazioni, password
- Determined tenant slug is accessible via `tenant_slug` cookie (httpOnly: false)
- Installed `qrcode.react` v4.2.0
- Added QR Code section to Negozio tab with:
  - Dynamic URL generation (subdomain for production, `/t/slug` for Vercel)
  - `QRCodeCanvas` component (size 200, level H, stone-900 foreground)
  - Elegant box with stone-50 background and rounded-2xl corners
  - Download button that exports canvas to PNG with 32px white padding
  - Filename: `qrcode-intelligenda.png`
- Verified zero new TypeScript errors (pre-existing errors in legacy SPA components only)

Stage Summary:
- Commit: `43430e0` — "feat: add QR Code for shop window in admin Negozio tab"
- Files modified: `src/app/admin/impostazioni/page.tsx`, `package.json`, `package-lock.json`
- Library added: `qrcode.react@4.2.0`
- The QR code section appears below the shop info form in the Negozio tab

---
Task ID: 1
Agent: Main Agent
Task: Enterprise polish — 4 rifiniture strategiche (WhatsApp, Clienti, etc.)

Work Log:
- Analyzed existing codebase: found features 1 (Google Calendar), 2 (Rate Limiting), 3a (Cancel route), 4b (Print CSS) already implemented
- Added WhatsApp button in admin booking detail modal (calendario/page.tsx)
- Added MessageCircle icon import from lucide-react
- Added shopName state + fetch from /api/config for personalized WhatsApp messages
- Created openWhatsApp() function with pre-filled message including cancel link
- Created /api/clients/route.ts — Prisma groupBy aggregation endpoint (admin-only)
- Created /admin/clienti/page.tsx — Client archive with search, sort, CSV export, responsive design
- Added 'Clienti' nav item in admin layout sidebar with Users icon
- Verified: zero TypeScript errors, clean build, push to GitHub

Stage Summary:
- Commit: 29581cf — "feat: enterprise polish — WhatsApp button, Clienti archive page"
- Files created: src/app/admin/clienti/page.tsx, src/app/api/clients/route.ts
- Files modified: src/app/admin/calendario/page.tsx, src/app/admin/layout.tsx
- All 4 requested features verified complete (2 were already implemented)

---
Task ID: 2
Agent: Main Agent
Task: Fix missing welcome email and "Password dimenticata?" link

Work Log:
- Investigated login page: confirmed "Password dimenticata?" link was never added
- Investigated register route: confirmed sendWelcomeEmail() call was never added
- Investigated email.ts: confirmed sendWelcomeEmail() and sendPasswordResetEmail() functions were never created
- Verified no forgot-password/reset-password API routes or pages existed
- Added resetToken/resetTokenExpires fields to AdminUser model in schema.prisma
- Added 3 migration DDL statements in db.ts for the new columns
- Created sendWelcomeEmail() and sendPasswordResetEmail() in email.ts with HTML templates
- Added sendWelcomeEmail() fire-and-forget call in /api/register after tenant creation
- Created POST /api/auth/forgot-password with anti-enumeration pattern
- Created POST /api/auth/reset-password with token validation + password hash
- Created /admin/forgot-password page with email form + success state
- Created /admin/reset-password page with new password form + token validation
- Added "Password dimenticata?" link to /admin/login page (below the Accedi button)
- Generated Prisma client, clean build with 52 routes

Stage Summary:
- All previous session edits were lost (never actually applied) — rebuilt everything from scratch
- Files created: forgot-password/route.ts, reset-password/route.ts, forgot-password/page.tsx, reset-password/page.tsx
- Files modified: schema.prisma, db.ts, email.ts, register/route.ts, login/page.tsx
- Build passes cleanly with 52 routes including 4 new password reset routes

---
Task ID: 3
Agent: Main Agent
Task: Add operator selection step in client booking flow (/prenota)

Work Log:
- Analyzed existing architecture: M:N Resource↔Service already in Prisma, admin checkboxes already done, slot algorithm already supports resourceId
- Verified bookingSchema already has `resourceId: z.string().optional()`
- Verified /api/slots and /api/slots/batch already accept `resourceId` query param
- Verified /api/bookings POST already handles resourceId in findFreeResource
- Verified /api/resources/public filters operators by requested serviceIds
- Modified `/src/app/prenota/page.tsx` to add operator selection:
  - Added `resourceId` field to BookingData interface
  - Added `ResourceOption` interface and `availableResources`/`loadingResources` state
  - Created new StepOperator component (step 2): shows operators filtered by selected services + "Qualsiasi operatore disponibile" default option
  - Shifted Calendar to step 3, Customer Info to step 4, Confirmation to step 5
  - Updated stepLabels: Servizi → Operatore → Data → Dati (4 steps before confirmation)
  - Added useEffect to fetch `/api/resources/public?serviceIds=...` when entering step 2
  - Auto-skip operator step if no resources exist (goes straight to calendar)
  - Reset resourceId and date/time when services change (going back to step 1)
  - Pass `resourceId` to `/api/slots/batch` and `/api/slots` calls (filtered availability)
  - Pass `resourceId` to booking POST payload
  - Pass `resourceId` to slot verification before submit
  - Show selected operator name in calendar subtitle, customer info summary, confirmation screen, and Google Calendar link
  - Added `Users` icon import from lucide-react for operator step
- TypeScript verification: zero new errors

Stage Summary:
- File modified: `src/app/prenota/page.tsx` (complete rewrite with operator selection)
- No schema/API changes needed — all backend infrastructure was already in place
- The client flow is now: Servizi → Operatore → Data/Ora → Dati Cliente → Confermata
- Backward compatible: resourceId defaults to null (auto-assignment), same as before

---
Task ID: 4
Agent: Main Agent
Task: Customer OTP authentication system — optional login for client booking flow

Work Log:
- Added `CustomerUser` model to Prisma schema (id, tenantId, configId, nome, telefono @unique, email @unique, otpCode, otpExpires)
- Added `customerId` field on `Booking` model (nullable, with FK → CustomerUser, onDelete: SetNull)
- Added reverse relations on `Tenant` and `BusinessConfig` for CustomerUser
- Added 14 DDL statements to db.ts auto-migration (CustomerUser table + FKs + indexes + Booking.customerId)
- Created `src/lib/customer-auth.ts`: JWT-based customer session management (createToken, verifyToken, getCustomerSession, setCustomerSessionCookie, clearCustomerSessionCookie) — 30-day cookie, httpOnly
- Created OTP email template in `email.ts` (Apple minimal style): large 6-digit code, 10-min expiry warning, stone-900 header
- Created `POST /api/auth/customer/request-otp`: validates email, rate limits (3/email/10min), finds or creates CustomerUser, generates 6-digit OTP, sends via Resend
- Created `POST /api/auth/customer/verify-otp`: verifies OTP + expiry, clears OTP fields, creates JWT cookie, returns customer data for pre-fill
- Created `GET /api/auth/customer/me`: returns authenticated customer profile from cookie
- Updated `POST /api/bookings`: reads customer_session cookie, links customerId to booking if auth'd, updates customer nome/telefono profile on each booking
- Updated `/prenota/page.tsx` Step 4 (Customer Info):
  - Added amber banner: "Hai un account? Accedi per gestire le tue prenotazioni" with "Accedi" button
  - Added emerald welcome banner for logged-in users: "Bentornato [Nome]!"
  - Added inline login modal with email input + OTP code input (6 digits, numeric keypad)
  - On mount, checks `/api/auth/customer/me` and pre-fills form fields
  - On successful OTP verification, pre-fills Nome, Cognome, Telefono, Email from customer profile
- TypeScript verification: zero new errors (after prisma generate)

Stage Summary:
- Files created: src/lib/customer-auth.ts, src/app/api/auth/customer/request-otp/route.ts, src/app/api/auth/customer/verify-otp/route.ts, src/app/api/auth/customer/me/route.ts
- Files modified: prisma/schema.prisma, src/lib/db.ts, src/lib/email.ts, src/app/api/bookings/route.ts, src/app/prenota/page.tsx
- Fully backward compatible: customers can still book without logging in (anonymous/guest flow)
