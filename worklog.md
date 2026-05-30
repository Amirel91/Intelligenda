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
