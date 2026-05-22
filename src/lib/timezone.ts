/**
 * Timezone utilities for IntelliGenda.
 *
 * All business logic operates in Europe/Rome (CET/CEST).
 * The server (Vercel) runs in UTC, so every date/time conversion
 * between wall-clock Rome time and UTC must go through these helpers.
 *
 * No external dependencies — uses only Intl.DateTimeFormat (available in
 * both Node.js 18+ and all modern browsers).
 */

export const BUSINESS_TZ = 'Europe/Rome'

// ---------------------------------------------------------------------------
// Internal: offset between UTC and Europe/Rome at a given instant (minutes)
// ---------------------------------------------------------------------------

function getRomeOffsetMinutes(date: Date): number {
  // Format the same instant in UTC and Rome, parse both in server-local TZ.
  // The difference is the Rome offset regardless of server timezone.
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const romeDate = new Date(date.toLocaleString('en-US', { timeZone: BUSINESS_TZ }))
  let diff = Math.round((romeDate.getTime() - utcDate.getTime()) / 60_000)

  // Normalise to ±12 h range (handles midnight date-boundary crossings)
  if (diff > 720) diff -= 1440
  if (diff < -720) diff += 1440
  return diff
}

// ---------------------------------------------------------------------------
// Create a Date that represents a specific wall-clock time in Europe/Rome
// ---------------------------------------------------------------------------

/**
 * Parse a date string ("YYYY-MM-DD") and optional time ("HH:MM") as
 * Europe/Rome local time and return the equivalent UTC Date.
 *
 * Example:  createInRome('2025-07-15', '09:00')  →  2025-07-15T07:00:00Z  (CEST +2)
 */
export function createInRome(dateStr: string, timeStr: string = '00:00'): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  // Treat the numbers as UTC, then subtract the Rome offset so that
  // when rendered in Rome they show the intended wall-clock time.
  const asUTC = Date.UTC(year, month - 1, day, hours, minutes, 0, 0)
  const offset = getRomeOffsetMinutes(new Date(asUTC))
  return new Date(asUTC - offset * 60_000)
}

// ---------------------------------------------------------------------------
// Extract date/time components from a UTC Date in Rome timezone
// ---------------------------------------------------------------------------

/**
 * Return "YYYY-MM-DD" for a Date (from DB) expressed in Europe/Rome.
 */
export function formatDateRome(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * Return "HH:MM" for a Date (from DB) expressed in Europe/Rome.
 */
export function formatTimeRome(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('hour')}:${get('minute')}`
}

/**
 * Return minutes-from-midnight for a Date (from DB) in Europe/Rome.
 * Used to compare against working-hour "HH:MM" strings.
 */
export function getMinutesFromMidnightRome(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  return h * 60 + m
}

/**
 * Return the day-of-week for a YYYY-MM-DD string in Europe/Rome.
 * Follows our WorkingHours convention: 1 = Monday … 7 = Sunday.
 */
export function getDayOfWeekRome(dateStr: string): number {
  // Use noon to stay safely away from DST boundaries
  const ref = createInRome(dateStr, '12:00')
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    weekday: 'long',
  }).format(ref)

  const map: Record<string, number> = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
    Friday: 5, Saturday: 6, Sunday: 7,
  }
  return map[weekday] ?? 1
}

// ---------------------------------------------------------------------------
// UTC query bounds for a Rome-calendar-day
// ---------------------------------------------------------------------------

/**
 * Return { start, end } Date objects that bracket a full calendar day
 * in Europe/Rome, suitable for Prisma `gte` / `lt` queries.
 *
 * Example:  getDayRangeUTC('2025-07-15')
 *   → start = 2025-07-14T22:00:00Z  (midnight Rome = 22:00 UTC in CEST)
 *   → end   = 2025-07-15T22:00:00Z  (next midnight Rome)
 */
export function getDayRangeUTC(dateStr: string): { start: Date; end: Date } {
  return {
    start: createInRome(dateStr, '00:00'),
    end: createInRome(dateStr, '23:59'),
  }
}

// ---------------------------------------------------------------------------
// Safe date-string arithmetic (avoids DST edge cases)
// ---------------------------------------------------------------------------

/**
 * Add `days` to a "YYYY-MM-DD" string and return a new "YYYY-MM-DD" string.
 * Pure string arithmetic — no timezone ambiguity.
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
