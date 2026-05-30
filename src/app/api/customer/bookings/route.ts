import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getCustomerSession } from '@/lib/customer-auth'
import { getTenantConfig } from '@/lib/tenant'

// Force dynamic — never cache bookings list
export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/bookings
 *
 * Returns all bookings for the currently logged-in customer,
 * filtered by tenant context. Includes service names.
 */
export async function GET(request: Request) {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const config = await getTenantConfig(request as unknown as import('next/server').NextRequest)
    if (!config) {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }

    // Ensure we only return bookings for this specific tenant
    await ensureDbSchema()

    const bookings = await db.booking.findMany({
      where: {
        customerId: session.customerId,
        configId: config.id,
      },
      orderBy: { startTime: 'desc' },
      include: {
        services: {
          include: {
            service: {
              select: { name: true, durationMinutes: true },
            },
          },
        },
        resource: {
          select: { name: true },
        },
      },
    })

    // Transform to a cleaner format
    const transformed = bookings.map(b => ({
      id: b.id,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      totalPrice: b.totalPrice,
      services: b.services.map(bs => ({
        name: bs.service.name,
        durationMinutes: bs.service.durationMinutes,
      })),
      resource: b.resource?.name || null,
      createdAt: b.createdAt.toISOString(),
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('GET /api/customer/bookings error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento delle prenotazioni' }, { status: 500 })
  }
}
