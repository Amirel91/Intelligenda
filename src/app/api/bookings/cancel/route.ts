import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'

/**
 * POST /api/bookings/cancel
 * Public endpoint: allows a customer to cancel their own booking.
 * No admin auth required — the bookingId is the auth token.
 * Sets status to "cancelled" so the slot reopens on the public calendar.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'ID prenotazione mancante' }, { status: 400 })
    }

    // Find the booking (public, no tenant check — bookingId is unique across system)
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: { include: { service: true } },
        config: { select: { shopName: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    }

    // Dry run: return booking details without cancelling
    if (body.dryRun) {
      return NextResponse.json({ booking })
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Questa prenotazione e gia stata annullata' }, { status: 400 })
    }

    if (booking.status === 'blocked') {
      return NextResponse.json({ error: 'Impossibile annullare un blocco orario' }, { status: 400 })
    }

    // Update status to cancelled
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
      include: {
        services: { include: { service: true } },
        config: { select: { shopName: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Prenotazione annullata con successo',
      booking: updated,
    })
  } catch (error) {
    console.error('POST /api/bookings/cancel error:', error)
    return NextResponse.json({ error: 'Errore durante la cancellazione' }, { status: 500 })
  }
}
