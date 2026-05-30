import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema, ensureApiLogTable, logApiPerformance } from '@/lib/db'
import { getBatchAvailability } from '@/lib/slot-algorithm'
import { getTenantConfigWithCalendarIncludes } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/**
 * GET /api/slots/batch?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&duration=60&resourceId=xxx
 *
 * OPTIMIZED: Returns availability for ALL days in a date range in a single call.
 * Replaces the old pattern of N individual /api/slots?date=... calls (one per day).
 *
 * Response: { "YYYY-MM-DD": "high"|"medium"|"low"|"none", ... }
 */
export async function GET(request: NextRequest) {
  const startMs = Date.now()
  let _configId: string | undefined
  try {
    await ensureDbSchema()
    await ensureApiLogTable()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const duration = searchParams.get('duration')
    const resourceId = searchParams.get('resourceId')

    if (!startDate || !endDate || !duration) {
      return NextResponse.json(
        { error: 'Parametri startDate, endDate e duration sono obbligatori' },
        { status: 400 }
      )
    }

    const durationMinutes = parseInt(duration, 10)
    if (isNaN(durationMinutes) || durationMinutes < 5) {
      return NextResponse.json(
        { error: 'La durata deve essere un numero valido (minimo 5 minuti)' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Formato data non valido. Usare YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // INTERVENTO 1: Single query with eager-loaded calendar relations
    const config = await getTenantConfigWithCalendarIncludes(request)
    if (!config) {
      return NextResponse.json({})
    }
    _configId = config.id

    const result = await getBatchAvailability(
      startDate, endDate, durationMinutes, config.id,
      resourceId || undefined, config
    )
    logApiPerformance('/api/slots/batch', Date.now() - startMs, config.id)
    return NextResponse.json(result)
  } catch (error) {
    logApiPerformance('/api/slots/batch', Date.now() - startMs, _configId)
    console.error('GET /api/slots/batch error:', error)
    return NextResponse.json({ error: 'Errore nel calcolo della disponibilita' }, { status: 500 })
  }
}
