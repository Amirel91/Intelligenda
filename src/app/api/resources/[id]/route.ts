import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'
import { z } from 'zod'

const updateResourceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// PUT /api/resources/[id] — Admin: update a resource
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const config = await requireTenantConfig(request)
    const { id } = await params

    const body = await request.json()
    const data = updateResourceSchema.parse(body)

    // Verify resource belongs to this tenant's config
    const existing = await db.resource.findFirst({
      where: { id, configId: config.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Risorsa non trovata' }, { status: 404 })
    }

    // Prevent deactivating the last active resource
    if (data.active === false) {
      const activeCount = await db.resource.count({
        where: { configId: config.id, active: true },
      })
      if (activeCount <= 1) {
        return NextResponse.json(
          { error: 'Deve rimanere almeno una postazione attiva' },
          { status: 400 }
        )
      }
    }

    const resource = await db.resource.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    })

    return NextResponse.json(resource)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 })
    }
    console.error('PUT /api/resources/[id] error:', error)
    return NextResponse.json({ error: 'Errore nell\'aggiornamento della risorsa' }, { status: 500 })
  }
}

// DELETE /api/resources/[id] — Admin: delete a resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const config = await requireTenantConfig(request)
    const { id } = await params

    // Verify resource belongs to this tenant's config
    const existing = await db.resource.findFirst({
      where: { id, configId: config.id },
      include: { _count: { select: { bookings: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Risorsa non trovata' }, { status: 404 })
    }

    // Prevent deleting the last resource
    const totalCount = await db.resource.count({
      where: { configId: config.id },
    })
    if (totalCount <= 1) {
      return NextResponse.json(
        { error: 'Deve rimanere almeno una postazione' },
        { status: 400 }
      )
    }

    // Delete resource (bookings' resourceId will be SET NULL via FK)
    await db.resource.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    console.error('DELETE /api/resources/[id] error:', error)
    return NextResponse.json({ error: 'Errore nell\'eliminazione della risorsa' }, { status: 500 })
  }
}
