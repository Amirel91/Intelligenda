import { NextRequest, NextResponse } from 'next/server'
import { getBatchAvailability } from '@/lib/slot-algorithm'
import { getTenantConfig } from '@/lib/tenant'

/**
 * GET /api/slots/batch?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&duration=60
 *
 * OPTIMIZED: Returns availability for ALL days in a date range in a single call.
 * Replaces the old pattern of N individual /api/slots?date=... calls (one per day).
 *
 * Response: { "YYYY-MM-DD": "high"|"medium"|"low"|"none", ... }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const duration = searchParams.get('duration')

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

    const config = await getTenantConfig(request)
    if (!config) {
      return NextResponse.json({})
    }

    const result = await getBatchAvailability(startDate, endDate, durationMinutes, config.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/slots/batch error:', error)
    return NextResponse.json({ error: 'Errore nel calcolo della disponibilita' }, { status: 500 })
  }
}
