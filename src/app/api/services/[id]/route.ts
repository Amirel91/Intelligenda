import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { serviceSchema } from '@/lib/validations'
import { requireTenantConfig } from '@/lib/tenant'

// PUT /api/services/[id] - Admin: update service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const data = serviceSchema.parse(body)

    const config = await requireTenantConfig(request)

    const existing = await db.service.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })
    }

    // Verify service belongs to current tenant
    if (existing.configId !== config.id) {
      return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })
    }

    const service = await db.service.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category || null,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        durationMinutes: data.durationMinutes,
        cleanupMinutes: data.cleanupMinutes,
        bufferMinutes: data.bufferMinutes,
        featured: data.featured,
        active: data.active,
        sortOrder: data.sortOrder,
      },
    })

    return NextResponse.json(service)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dati non validi', details: error }, { status: 400 })
    }
    console.error('PUT /api/services/[id] error:', error)
    return NextResponse.json({ error: 'Errore nell\'aggiornamento del servizio' }, { status: 500 })
  }
}

// DELETE /api/services/[id] - Admin: delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const { id } = await params

    const config = await requireTenantConfig(request)

    const existing = await db.service.findUnique({ where: { id } })
    if (!existing || existing.configId !== config.id) {
      return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })
    }

    // Check if service is used in any active bookings (via BookingService pivot)
    const activeBookings = await db.bookingService.count({
      where: {
        serviceId: id,
        booking: {
          status: { in: ['confirmed', 'pending'] },
        },
      },
    })

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `Impossibile eliminare: ci sono ${activeBookings} prenotazioni attive che usano questo servizio. Disattiva il servizio invece.` },
        { status: 409 }
      )
    }

    await db.service.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    console.error('DELETE /api/services/[id] error:', error)
    return NextResponse.json({ error: 'Errore nell\'eliminazione del servizio' }, { status: 500 })
  }
}
