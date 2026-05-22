import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'

// GET /api/clients — Grouped client archive with booking counts
export async function GET(request: Request) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const config = await requireTenantConfig(request as Parameters<typeof requireTenantConfig>[0])

    // Aggregate clients from bookings (no separate Customer model)
    const clients = await db.booking.groupBy({
      by: ['customerName', 'customerSurname', 'customerPhone', 'customerEmail'],
      where: {
        configId: config.id,
        status: { not: 'blocked' },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalPrice: true,
      },
      _min: {
        startTime: true,
      },
      _max: {
        startTime: true,
      },
      orderBy: {
        _count: { id: 'desc' },
      },
    })

    const formatted = clients.map(c => ({
      customerName: c.customerName,
      customerSurname: c.customerSurname,
      customerPhone: c.customerPhone,
      customerEmail: c.customerEmail || null,
      totalBookings: c._count.id,
      totalSpent: c._sum.totalPrice || 0,
      firstBooking: c._min.startTime,
      lastBooking: c._max.startTime,
    }))

    return NextResponse.json(formatted)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    console.error('GET /api/clients error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento dei clienti' }, { status: 500 })
  }
}
