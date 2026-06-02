import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()

    const body = await request.json()
    const { bookingId, rating } = body

    if (!bookingId || !rating) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating non valido (1-5)' }, { status: 400 })
    }

    // Check booking exists
    const booking = await db.booking.findUnique({ where: { id: bookingId } })
    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    }

    // Upsert: allow re-rating (update if exists, create if not)
    const feedback = await db.feedback.upsert({
      where: { bookingId },
      create: { bookingId, rating },
      update: { rating },
    })

    return NextResponse.json({ ok: true, id: feedback.id })
  } catch (error: unknown) {
    console.error('[POST /api/feedback]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
