import { db, ensureDbSchema } from './db'
import {
  getDayOfWeekRome,
  getMinutesFromMidnightRome,
  formatDateRome,
  createInRome,
  addDays,
} from './timezone'

export interface SlotResult {
  date: string          // "YYYY-MM-DD"
  slots: string[]       // ["09:00", "09:15", ...]
  availability: 'high' | 'medium' | 'low' | 'none' // for calendar coloring
}

interface ResourceWithRanges {
  id: string
  name: string
  bookedRanges: { start: number; end: number }[]
}

// ============ PER-RESOURCE AVAILABILITY TYPES ============

interface ResourceWithAvailability extends ResourceWithRanges {
  availability: Map<number, { openMinutes: number; closeMinutes: number }>
  hasCustomAvailability: boolean
}

/**
 * Merge raw ResourceAvailability DB records with resource list.
 * Each resource gets a Map<dayOfWeek, {openMinutes, closeMinutes}>.
 * If a resource has NO custom records → hasCustomAvailability=false → uses shop hours.
 */
function mergeResourceAvailability(
  resources: { id: string; name: string }[],
  resourceAvailability: { resourceId: string; dayOfWeek: number; openTime: string; closeTime: string; closed: boolean }[],
): ResourceWithAvailability[] {
  // Group availability by resource
  const availByResource = new Map<string, Map<number, { openMinutes: number; closeMinutes: number }>>()
  for (const a of resourceAvailability) {
    if (a.closed) continue // Only store open days
    let resourceMap = availByResource.get(a.resourceId)
    if (!resourceMap) {
      resourceMap = new Map()
      availByResource.set(a.resourceId, resourceMap)
    }
    const [oH, oM] = a.openTime.split(':').map(Number)
    const [cH, cM] = a.closeTime.split(':').map(Number)
    resourceMap.set(a.dayOfWeek, { openMinutes: oH * 60 + oM, closeMinutes: cH * 60 + cM })
  }

  return resources.map(r => {
    const customAvail = availByResource.get(r.id)
    return {
      id: r.id,
      name: r.name,
      bookedRanges: [],
      availability: customAvail || new Map(),
      hasCustomAvailability: (customAvail && customAvail.size > 0) || false,
    }
  })
}

/**
 * Check if a date string ("YYYY-MM-DD") falls within any of the given closed periods.
 */
function isDateInClosedPeriod(
  dateStr: string,
  closedPeriods: { startDate: string; endDate: string }[]
): boolean {
  return closedPeriods.some(cp => dateStr >= cp.startDate && dateStr <= cp.endDate)
}

/**
 * Get the current time in Rome timezone as minutes-from-midnight.
 */
function getCurrentMinutesRome(): number {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  return h * 60 + m
}

/**
 * Check whether a date string ("YYYY-MM-DD") is today in Europe/Rome.
 */
function isTodayRome(dateStr: string): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const todayStr = `${get('year')}-${get('month')}-${get('day')}`
  return dateStr === todayStr
}

/**
 * Check if a slot falls within a resource's custom availability window.
 * Returns true if the resource is AVAILABLE for this slot time on this day.
 */
function isResourceAvailableForSlot(
  resource: ResourceWithAvailability,
  dayOfWeek: number,
  slotStart: number,
  slotEnd: number,
  shopOpenMinutes: number,
  shopCloseMinutes: number,
): boolean {
  if (resource.hasCustomAvailability) {
    const dayAvail = resource.availability.get(dayOfWeek)
    if (!dayAvail) return false // No availability set for this day → resource unavailable
    // Slot must fit within resource's custom window
    if (slotStart < dayAvail.openMinutes || slotEnd > dayAvail.closeMinutes) return false
    return true
  }
  // No custom availability → falls back to shop's global hours
  // The slot is already bounded by shopOpenMinutes/shopCloseMinutes in the outer loop,
  // but we still need to make sure the slot fits
  return slotStart >= shopOpenMinutes && slotEnd <= shopCloseMinutes
}

/**
 * Smart slot algorithm (Multi-Resource):
 *
 * Given a date and a total duration (in minutes), find all time slots
 * where there's at least ONE active resource (chair/collaborator) that is
 * completely free for the entire duration.
 *
 * The slot is VALID if ANY resource has no overlapping bookings/blocks.
 * This enables parallel scheduling across multiple chairs.
 *
 * Falls back to single-resource behavior if no resources exist (backward compat).
 *
 * Returns slots in 15-minute intervals aligned to :00, :15, :30, :45
 */
export async function getAvailableSlots(
  dateStr: string,
  totalDurationMinutes: number,
  configId?: string,
  resourceId?: string | null
): Promise<SlotResult> {
  const dayOfWeek = getDayOfWeekRome(dateStr) // 1=Mon ... 7=Sun (Europe/Rome)

  // Get working hours for this day + closed periods
  const config = await db.businessConfig.findFirst({
    where: configId ? { id: configId } : undefined,
    include: { workingHours: true, closedDates: true, closedPeriods: true },
  })

  if (!config) {
    return { date: dateStr, slots: [], availability: 'none' }
  }

  // Check if this date is explicitly closed
  const isClosedDate = config.closedDates.some(cd => cd.date === dateStr)
  if (isClosedDate) {
    return { date: dateStr, slots: [], availability: 'none' }
  }

  // Check if this date falls within a closed period (vacations etc.)
  if (isDateInClosedPeriod(dateStr, config.closedPeriods)) {
    return { date: dateStr, slots: [], availability: 'none' }
  }

  const wh = config.workingHours.find(w => w.dayOfWeek === dayOfWeek)

  if (!wh || wh.closed) {
    return { date: dateStr, slots: [], availability: 'none' }
  }

  const [openH, openM] = wh.openTime.split(':').map(Number)
  const [closeH, closeM] = wh.closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  // Parse lunch break
  let lunchStart = -1
  let lunchEnd = -1
  if (config.lunchBreakEnabled && config.lunchBreakStart && config.lunchBreakEnd) {
    const [lsH, lsM] = config.lunchBreakStart.split(':').map(Number)
    const [leH, leM] = config.lunchBreakEnd.split(':').map(Number)
    lunchStart = lsH * 60 + lsM
    lunchEnd = leH * 60 + leM
  }

  // Get active resources for this config
  let resources = await db.resource.findMany({
    where: { configId: config.id, active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  // If a specific resourceId is requested, filter to only that resource
  if (resourceId) {
    resources = resources.filter(r => r.id === resourceId)
    // If the requested resource doesn't exist or is inactive, return empty
    if (resources.length === 0) {
      return { date: dateStr, slots: [], availability: 'none' }
    }
  }

  // Load per-resource availability (single query)
  const resourceAvail = await db.resourceAvailability.findMany({
    where: { resourceId: { in: resources.map(r => r.id) } },
  })
  const resourcesWithAvail = mergeResourceAvailability(resources, resourceAvail)

  // If a specific resourceId was requested and it has custom availability but is closed this day
  if (resourceId && resourcesWithAvail.length === 1 && resourcesWithAvail[0].hasCustomAvailability) {
    const dayAvail = resourcesWithAvail[0].availability.get(dayOfWeek)
    if (!dayAvail) {
      return { date: dateStr, slots: [], availability: 'none' }
    }
  }

  // Get ALL bookings for this date (across all resources) — UTC bounds from Rome day
  const dayStart = createInRome(dateStr, '00:00')
  const dayEnd = createInRome(dateStr, '23:59')
  const bookings = await db.booking.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
      status: { in: ['confirmed', 'pending', 'blocked'] },
      configId: config.id,
    },
    select: {
      startTime: true,
      endTime: true,
      resourceId: true,
    },
  })

  // Build per-resource booked ranges (on ResourceWithAvailability structures)
  const unassignedRanges: { start: number; end: number }[] = []

  for (const b of bookings) {
    const range = {
      start: getMinutesFromMidnightRome(new Date(b.startTime)),
      end: getMinutesFromMidnightRome(new Date(b.endTime)),
    }

    if (b.resourceId) {
      const resource = resourcesWithAvail.find(r => r.id === b.resourceId)
      if (resource) {
        resource.bookedRanges.push(range)
      } else {
        unassignedRanges.push(range)
      }
    } else {
      unassignedRanges.push(range)
    }
  }

  // Minimum notice: if today, hide slots too close to now
  const minNoticeMinutes = (config.minNoticeHours || 1) * 60
  const cutoffMinutes = isTodayRome(dateStr) ? getCurrentMinutesRome() + minNoticeMinutes : -1

  // Compute the overall slot window:
  // For "any resource" mode: use the full shop hours as the outer loop bounds,
  // then check each resource individually.
  // For specific resource with custom availability: use the resource's hours as bounds.
  let loopOpenMinutes = openMinutes
  let loopCloseMinutes = closeMinutes

  if (resourceId && resourcesWithAvail.length === 1 && resourcesWithAvail[0].hasCustomAvailability) {
    const dayAvail = resourcesWithAvail[0].availability.get(dayOfWeek)
    if (dayAvail) {
      loopOpenMinutes = Math.max(openMinutes, dayAvail.openMinutes)
      loopCloseMinutes = Math.min(closeMinutes, dayAvail.closeMinutes)
    }
  }

  // Find all possible start times (every 15 min)
  const STEP = 15
  const availableSlots: string[] = []

  for (let t = loopOpenMinutes; t + totalDurationMinutes <= loopCloseMinutes; t += STEP) {
    const slotEnd = t + totalDurationMinutes

    // Minimum notice check: skip slots that start too soon
    if (cutoffMinutes >= 0 && t < cutoffMinutes) {
      continue
    }

    // Check if this slot overlaps with lunch break
    if (lunchStart >= 0 && lunchEnd >= 0) {
      if (t < lunchEnd && slotEnd > lunchStart) {
        continue
      }
    }

    // Check if this slot is free on at least ONE resource
    let hasFreeResource = false

    for (const resource of resourcesWithAvail) {
      // Check against unassigned (legacy) bookings — block all resources
      let blockedByUnassigned = false
      for (const range of unassignedRanges) {
        if (t < range.end && slotEnd > range.start) {
          blockedByUnassigned = true
          break
        }
      }
      if (blockedByUnassigned) continue

      // Check resource's own availability window
      if (!isResourceAvailableForSlot(resource, dayOfWeek, t, slotEnd, openMinutes, closeMinutes)) {
        continue
      }

      // Check against this resource's own bookings
      let isFree = true
      for (const range of resource.bookedRanges) {
        if (t < range.end && slotEnd > range.start) {
          isFree = false
          break
        }
      }

      if (isFree) {
        hasFreeResource = true
        break
      }
    }

    if (hasFreeResource) {
      const h = Math.floor(t / 60)
      const m = t % 60
      availableSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }

  // Calculate availability percentage for color coding
  const totalPossibleSlots = Math.max(1, Math.floor((loopCloseMinutes - loopOpenMinutes - totalDurationMinutes) / STEP) + 1)
  const freeRatio = availableSlots.length / totalPossibleSlots

  let availability: SlotResult['availability']
  if (availableSlots.length === 0) {
    availability = 'none'
  } else if (freeRatio < 0.2) {
    availability = 'low'
  } else {
    availability = 'high'
  }

  return { date: dateStr, slots: availableSlots, availability }
}

/**
 * Find a free resource for a specific slot.
 * Used when creating a booking to auto-assign the best resource.
 * Returns the resource ID or null if no resource is free.
 */
export async function findFreeResource(
  dateStr: string,
  time: string,
  totalDurationMinutes: number,
  configId: string,
  preferredResourceId?: string | null
): Promise<string | null> {
  const [timeH, timeM] = time.split(':').map(Number)
  const slotStart = timeH * 60 + timeM
  const slotEnd = slotStart + totalDurationMinutes
  const dayOfWeek = getDayOfWeekRome(dateStr)

  // Get shop working hours to determine if the day is open at all
  const config = await db.businessConfig.findFirst({
    where: { id: configId },
    include: { workingHours: true },
  })
  if (!config) return null

  const wh = config.workingHours.find(w => w.dayOfWeek === dayOfWeek)
  if (!wh || wh.closed) return null

  const [shopOpenH, shopOpenM] = wh.openTime.split(':').map(Number)
  const [shopCloseH, shopCloseM] = wh.closeTime.split(':').map(Number)
  const shopOpenMinutes = shopOpenH * 60 + shopOpenM
  const shopCloseMinutes = shopCloseH * 60 + shopCloseM

  // If a specific resource was requested by the customer, try only that one
  if (preferredResourceId) {
    // Check if the preferred resource has custom availability for this day
    const resourceAvail = await db.resourceAvailability.findMany({
      where: { resourceId: preferredResourceId },
    })

    if (resourceAvail.length > 0) {
      // Resource has custom availability — check this specific day
      const dayAvail = resourceAvail.find(a => a.dayOfWeek === dayOfWeek)
      if (!dayAvail || dayAvail.closed) return null // Resource not available this day
      const [aOpenH, aOpenM] = dayAvail.openTime.split(':').map(Number)
      const [aCloseH, aCloseM] = dayAvail.closeTime.split(':').map(Number)
      const resOpen = aOpenH * 60 + aOpenM
      const resClose = aCloseH * 60 + aCloseM
      if (slotStart < resOpen || slotEnd > resClose) return null
    } else {
      // No custom availability — use shop hours
      if (slotStart < shopOpenMinutes || slotEnd > shopCloseMinutes) return null
    }

    const dayStart = createInRome(dateStr, '00:00')
    const dayEnd = createInRome(dateStr, '23:59')
    const bookings = await db.booking.findMany({
      where: {
        startTime: { gte: dayStart, lte: dayEnd },
        status: { in: ['confirmed', 'pending', 'blocked'] },
        configId,
      },
      select: { startTime: true, endTime: true, resourceId: true },
    })

    // Check unassigned bookings (block all resources)
    const unassignedBlocked = bookings
      .filter(b => !b.resourceId)
      .some(b => {
        const bs = getMinutesFromMidnightRome(new Date(b.startTime))
        const be = getMinutesFromMidnightRome(new Date(b.endTime))
        return slotStart < be && slotEnd > bs
      })
    if (unassignedBlocked) return null

    // Check only the preferred resource's bookings
    const hasOverlap = bookings
      .filter(b => b.resourceId === preferredResourceId)
      .some(b => {
        const bs = getMinutesFromMidnightRome(new Date(b.startTime))
        const be = getMinutesFromMidnightRome(new Date(b.endTime))
        return slotStart < be && slotEnd > bs
      })

    return hasOverlap ? null : preferredResourceId
  }

  // Get active resources
  const resources = await db.resource.findMany({
    where: { configId, active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  })

  if (resources.length === 0) return null

  // Load per-resource availability (single query)
  const resourceAvail = await db.resourceAvailability.findMany({
    where: { resourceId: { in: resources.map(r => r.id) } },
  })
  const resourcesWithAvail = mergeResourceAvailability(
    resources.map(r => ({ id: r.id, name: '' })),
    resourceAvail,
  )

  // Filter resources that are available for this specific day/time
  const availableResources = resourcesWithAvail.filter(r =>
    isResourceAvailableForSlot(r, dayOfWeek, slotStart, slotEnd, shopOpenMinutes, shopCloseMinutes)
  )

  if (availableResources.length === 0) return null

  // Get all bookings for this date — UTC bounds from Rome day
  const dayStart = createInRome(dateStr, '00:00')
  const dayEnd = createInRome(dateStr, '23:59')
  const bookings = await db.booking.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
      status: { in: ['confirmed', 'pending', 'blocked'] },
      configId,
    },
    select: { startTime: true, endTime: true, resourceId: true },
  })

  // Check unassigned bookings (block all resources) — Rome hours
  const unassignedBlocked = bookings
    .filter(b => !b.resourceId)
    .some(b => {
      const bs = getMinutesFromMidnightRome(new Date(b.startTime))
      const be = getMinutesFromMidnightRome(new Date(b.endTime))
      return slotStart < be && slotEnd > bs
    })

  if (unassignedBlocked) return null

  // Build per-resource booked ranges
  for (const b of bookings) {
    if (!b.resourceId) continue
    const range = {
      start: getMinutesFromMidnightRome(new Date(b.startTime)),
      end: getMinutesFromMidnightRome(new Date(b.endTime)),
    }
    const resource = availableResources.find(r => r.id === b.resourceId)
    if (resource) {
      resource.bookedRanges.push(range)
    }
  }

  // Find first available resource with no overlap
  for (const resource of availableResources) {
    let isFree = true
    for (const range of resource.bookedRanges) {
      if (slotStart < range.end && slotEnd > range.start) {
        isFree = false
        break
      }
    }
    if (isFree) return resource.id
  }

  return null // No resource is free
}

/**
 * OPTIMIZED: Batch availability for a date range.
 *
 * Instead of N individual getAvailableSlots() calls (each doing 3 DB queries),
 * this does only a few DB queries total:
 *   1. Config + workingHours + closedDates
 *   2. Active resources
 *   3. Per-resource availability
 *   4. All bookings in the date range
 *
 * Then computes availability for every day in memory.
 *
 * Returns a map: { "YYYY-MM-DD": availabilityLevel }
 */
export async function getBatchAvailability(
  startDate: string,
  endDate: string,
  totalDurationMinutes: number,
  configId?: string,
  resourceId?: string | null,
  // INTERVENTO 1: pre-loaded config (with workingHours, closedDates, closedPeriods)
  preloadedConfig?: any,
): Promise<Record<string, SlotResult['availability']>> {
  // INTERVENTO 1: Use pre-loaded config if available, otherwise fetch from DB
  let config = preloadedConfig || null
  if (!config) {
    config = await db.businessConfig.findFirst({
      where: configId ? { id: configId } : undefined,
      include: { workingHours: true, closedDates: true, closedPeriods: true },
    })
  }

  if (!config) {
    const result: Record<string, SlotResult['availability']> = {}
    let cur = startDate
    const end = endDate
    while (cur <= end) {
      result[cur] = 'none'
      cur = addDays(cur, 1)
    }
    return result
  }

  // Build lookup sets
  const closedDateSet = new Set(config.closedDates.map(cd => cd.date))
  const closedPeriods = config.closedPeriods || []

  // INTERVENTO 2: Create a single Intl formatter instance for Rome timezone.
  const romeDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const romeTimeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const romeWeekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome', weekday: 'long',
  })

  // INTERVENTO 2: Helpers — reuse single formatter instances
  const fmtDateRome = (date: Date): string => {
    const parts = romeDateParts.formatToParts(date)
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  }
  const fmtMinutesFromMidnight = (date: Date): number => {
    const parts = romeTimeParts.formatToParts(date)
    const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
    const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
    return h * 60 + m
  }
  const WEEKDAY_MAP: Record<string, number> = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
    Friday: 5, Saturday: 6, Sunday: 7,
  }
  const getDayOfWeekCached = (dateStr: string): number => {
    const ref = createInRome(dateStr, '12:00')
    return WEEKDAY_MAP[romeWeekday.format(ref)] ?? 1
  }

  // Minimum notice hours: cutoff for today's slots
  const minNoticeMinutes = (config.minNoticeHours || 1) * 60
  const todayRome = fmtDateRome(new Date())
  const noticeCutoff = todayRome >= startDate && todayRome <= endDate
    ? fmtMinutesFromMidnight(new Date()) + minNoticeMinutes
    : -1
  const workingHoursByDay = new Map<number, { openMinutes: number; closeMinutes: number }>()
  for (const wh of config.workingHours) {
    if (wh.closed) continue
    const [oH, oM] = wh.openTime.split(':').map(Number)
    const [cH, cM] = wh.closeTime.split(':').map(Number)
    workingHoursByDay.set(wh.dayOfWeek, { openMinutes: oH * 60 + oM, closeMinutes: cH * 60 + cM })
  }

  // Parse lunch break (shared across all days)
  let lunchStart = -1
  let lunchEnd = -1
  if (config.lunchBreakEnabled && config.lunchBreakStart && config.lunchBreakEnd) {
    const [lsH, lsM] = config.lunchBreakStart.split(':').map(Number)
    const [leH, leM] = config.lunchBreakEnd.split(':').map(Number)
    lunchStart = lsH * 60 + lsM
    lunchEnd = leH * 60 + leM
  }

  // 2. Active resources (single query)
  let resources = await db.resource.findMany({
    where: { configId: config.id, active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })

  if (resourceId) {
    resources = resources.filter(r => r.id === resourceId)
  }

  // 2b. Load per-resource availability (single query)
  const resourceAvail = await db.resourceAvailability.findMany({
    where: { resourceId: { in: resources.map(r => r.id) } },
  })
  const resourcesWithAvail = mergeResourceAvailability(resources, resourceAvail)

  // 3. ALL bookings in the date range (single query with composite index)
  const rangeStart = createInRome(startDate, '00:00')
  const rangeEnd = createInRome(endDate, '23:59')
  const allBookings = await db.booking.findMany({
    where: {
      startTime: { gte: rangeStart, lte: rangeEnd },
      status: { in: ['confirmed', 'pending', 'blocked'] },
      configId: config.id,
    },
    select: { startTime: true, endTime: true, resourceId: true },
  })

  // INTERVENTO 2: Pre-compute Rome date + minutes for ALL bookings in one pass.
  const bookingsWithRome = allBookings.map(b => {
    const start = new Date(b.startTime)
    const end = new Date(b.endTime)
    return {
      dateKey: fmtDateRome(start),
      startMinutes: fmtMinutesFromMidnight(start),
      endMinutes: fmtMinutesFromMidnight(end),
      resourceId: b.resourceId,
    }
  })

  // Group bookings by date string for fast lookup
  const bookingsByDate = new Map<string, typeof bookingsWithRome>()
  for (const b of bookingsWithRome) {
    const existing = bookingsByDate.get(b.dateKey)
    if (existing) existing.push(b)
    else bookingsByDate.set(b.dateKey, [b])
  }

  // INTERVENTO 2: Pre-compute day-of-week for every date in the range.
  const dayOfWeekCache = new Map<string, number>()
  let _d = startDate
  while (_d <= endDate) {
    dayOfWeekCache.set(_d, getDayOfWeekCached(_d))
    _d = addDays(_d, 1)
  }

  // Compute availability for each day in range
  const STEP = 15
  const result: Record<string, SlotResult['availability']> = {}

  let cur = startDate
  const end = endDate

  while (cur <= end) {
    const dateStr = cur

    const dayOfWeek = dayOfWeekCache.get(dateStr) ?? 1

    if (closedDateSet.has(dateStr)) {
      result[dateStr] = 'none'
      cur = addDays(cur, 1)
      continue
    }

    if (isDateInClosedPeriod(dateStr, closedPeriods)) {
      result[dateStr] = 'none'
      cur = addDays(cur, 1)
      continue
    }

    const wh = workingHoursByDay.get(dayOfWeek)
    if (!wh) {
      result[dateStr] = 'none'
      cur = addDays(cur, 1)
      continue
    }

    const { openMinutes: shopOpenMinutes, closeMinutes: shopCloseMinutes } = wh

    // For specific resource with custom availability, check if day is available at all
    if (resourceId && resourcesWithAvail.length === 1 && resourcesWithAvail[0].hasCustomAvailability) {
      const dayAvail = resourcesWithAvail[0].availability.get(dayOfWeek)
      if (!dayAvail) {
        result[dateStr] = 'none'
        cur = addDays(cur, 1)
        continue
      }
    }

    // Get bookings for this specific day (already pre-computed with Rome minutes)
    const dayBookings = bookingsByDate.get(dateStr) || []

    // Build per-resource booked ranges on the resourcesWithAvail structures
    for (const resource of resourcesWithAvail) {
      resource.bookedRanges = [] // Reset for each day
    }
    const unassignedRanges: { start: number; end: number }[] = []

    for (const b of dayBookings) {
      const range = { start: b.startMinutes, end: b.endMinutes }
      if (b.resourceId) {
        const res = resourcesWithAvail.find(r => r.id === b.resourceId)
        if (res) res.bookedRanges.push(range)
        else unassignedRanges.push(range)
      } else {
        unassignedRanges.push(range)
      }
    }

    // Determine the loop window bounds
    let loopOpen = shopOpenMinutes
    let loopClose = shopCloseMinutes
    if (resourceId && resourcesWithAvail.length === 1 && resourcesWithAvail[0].hasCustomAvailability) {
      const dayAvail = resourcesWithAvail[0].availability.get(dayOfWeek)
      if (dayAvail) {
        loopOpen = Math.max(shopOpenMinutes, dayAvail.openMinutes)
        loopClose = Math.min(shopCloseMinutes, dayAvail.closeMinutes)
      }
    }

    let availableCount = 0
    let totalPossible = 0

    // Check if today: apply minimum notice cutoff
    const dayCutoff = (noticeCutoff >= 0 && dateStr === todayRome) ? noticeCutoff : -1

    for (let t = loopOpen; t + totalDurationMinutes <= loopClose; t += STEP) {
      totalPossible++
      const slotEnd = t + totalDurationMinutes

      if (dayCutoff >= 0 && t < dayCutoff) continue
      if (lunchStart >= 0 && lunchEnd >= 0 && t < lunchEnd && slotEnd > lunchStart) continue

      let hasFree = false
      for (const resource of resourcesWithAvail) {
        let blocked = false
        for (const range of unassignedRanges) {
          if (t < range.end && slotEnd > range.start) { blocked = true; break }
        }
        if (blocked) continue

        // Check resource's own availability window
        if (!isResourceAvailableForSlot(resource, dayOfWeek, t, slotEnd, shopOpenMinutes, shopCloseMinutes)) {
          continue
        }

        let isFree = true
        for (const range of resource.bookedRanges) {
          if (t < range.end && slotEnd > range.start) { isFree = false; break }
        }
        if (isFree) { hasFree = true; break }
      }
      if (hasFree) availableCount++
    }

    totalPossible = Math.max(1, totalPossible)
    const freeRatio = availableCount / totalPossible

    if (availableCount === 0) {
      result[dateStr] = 'none'
    } else if (freeRatio < 0.2) {
      result[dateStr] = 'low'
    } else {
      result[dateStr] = 'high'
    }

    cur = addDays(cur, 1)
  }

  return result
}

/**
 * Lightweight single-slot availability check.
 * Used for real-time validation during booking creation.
 * Respects per-resource availability windows.
 */
export async function isSlotAvailable(
  dateStr: string,
  time: string,
  totalDurationMinutes: number,
  configId?: string,
  resourceId?: string | null
): Promise<boolean> {
  const [timeH, timeM] = time.split(':').map(Number)
  const slotStart = timeH * 60 + timeM
  const slotEnd = slotStart + totalDurationMinutes
  const dayOfWeek = getDayOfWeekRome(dateStr)

  const config = await db.businessConfig.findFirst({
    where: configId ? { id: configId } : undefined,
    select: { id: true, lunchBreakEnabled: true, lunchBreakStart: true, lunchBreakEnd: true, minNoticeHours: true },
  })
  if (!config) return false

  // Check lunch break
  if (config.lunchBreakEnabled && config.lunchBreakStart && config.lunchBreakEnd) {
    const [lsH, lsM] = config.lunchBreakStart.split(':').map(Number)
    const [leH, leM] = config.lunchBreakEnd.split(':').map(Number)
    const lunchStart = lsH * 60 + lsM
    const lunchEnd = leH * 60 + leM
    if (slotStart < lunchEnd && slotEnd > lunchStart) return false
  }

  // Check if today: minimum notice
  if (isTodayRome(dateStr)) {
    const minNoticeMinutes = (config.minNoticeHours || 1) * 60
    const cutoff = getCurrentMinutesRome() + minNoticeMinutes
    if (slotStart < cutoff) return false
  }

  // Get shop working hours for this day
  const shopConfig = await db.businessConfig.findFirst({
    where: configId ? { id: configId } : undefined,
    select: { id: true, workingHours: true },
  })
  if (!shopConfig) return false

  const wh = shopConfig.workingHours.find(w => w.dayOfWeek === dayOfWeek)
  if (!wh || wh.closed) return false

  const [shopOpenH, shopOpenM] = wh.openTime.split(':').map(Number)
  const [shopCloseH, shopCloseM] = wh.closeTime.split(':').map(Number)
  const shopOpenMinutes = shopOpenH * 60 + shopOpenM
  const shopCloseMinutes = shopCloseH * 60 + shopCloseM

  // Get active resources
  let resources = await db.resource.findMany({
    where: { configId: config.id, active: true },
    select: { id: true, name: true },
  })
  if (resourceId) {
    resources = resources.filter(r => r.id === resourceId)
    if (resources.length === 0) return false
  }

  // Load per-resource availability (single query)
  const resourceAvail = await db.resourceAvailability.findMany({
    where: { resourceId: { in: resources.map(r => r.id) } },
  })
  const resourcesWithAvail = mergeResourceAvailability(resources, resourceAvail)

  // Filter resources that are available for this slot
  const availableResources = resourcesWithAvail.filter(r =>
    isResourceAvailableForSlot(r, dayOfWeek, slotStart, slotEnd, shopOpenMinutes, shopCloseMinutes)
  )

  if (availableResources.length === 0) return false

  // Get bookings for this date (single query)
  const dayStart = createInRome(dateStr, '00:00')
  const dayEnd = createInRome(dateStr, '23:59')
  const bookings = await db.booking.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
      status: { in: ['confirmed', 'pending', 'blocked'] },
      configId: config.id,
    },
    select: { startTime: true, endTime: true, resourceId: true },
  })

  // Check unassigned bookings (block all resources)
  const unassignedBlocked = bookings
    .filter(b => !b.resourceId)
    .some(b => {
      const bs = getMinutesFromMidnightRome(new Date(b.startTime))
      const be = getMinutesFromMidnightRome(new Date(b.endTime))
      return slotStart < be && slotEnd > bs
    })
  if (unassignedBlocked) return false

  // Build per-resource booked ranges
  for (const b of bookings) {
    if (!b.resourceId) continue
    const range = {
      start: getMinutesFromMidnightRome(new Date(b.startTime)),
      end: getMinutesFromMidnightRome(new Date(b.endTime)),
    }
    const resource = availableResources.find(r => r.id === b.resourceId)
    if (resource) {
      resource.bookedRanges.push(range)
    }
  }

  // Check if at least one resource is free
  for (const resource of availableResources) {
    let isFree = true
    for (const range of resource.bookedRanges) {
      if (slotStart < range.end && slotEnd > range.start) {
        isFree = false
        break
      }
    }
    if (isFree) return true
  }

  return false
}

/**
 * Check if a date is a closed date
 */
export async function isDateClosed(dateStr: string, configId?: string): Promise<boolean> {
  const config = await db.businessConfig.findFirst({
    where: configId ? { id: configId } : undefined,
    include: { closedDates: true, closedPeriods: true },
  })
  if (!config) return false
  if (config.closedDates.some(cd => cd.date === dateStr)) return true
  if (isDateInClosedPeriod(dateStr, config.closedPeriods)) return true
  return false
}

/**
 * Get all closed dates (single days + all days within closed periods)
 * for a given date range. Useful for the client booking calendar.
 */
export async function getAllClosedDatesInRange(
  startDate: string,
  endDate: string,
  configId?: string
): Promise<string[]> {
  const config = await db.businessConfig.findFirst({
    where: configId ? { id: configId } : undefined,
    include: { closedDates: true, closedPeriods: true },
  })
  if (!config) return []

  const closedSet = new Set<string>()
  for (const cd of config.closedDates) {
    if (cd.date >= startDate && cd.date <= endDate) closedSet.add(cd.date)
  }
  for (const cp of config.closedPeriods) {
    const s = cp.startDate > startDate ? cp.startDate : startDate
    const e = cp.endDate < endDate ? cp.endDate : endDate
    let cur = s
    while (cur <= e) {
      closedSet.add(cur)
      cur = addDays(cur, 1)
    }
  }
  return Array.from(closedSet).sort()
}
