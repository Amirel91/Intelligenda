import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'
import { z } from 'zod'

const updateResourceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  serviceIds: z.array(z.string()).optional(),
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

    // Build update data for scalar fields
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.active !== undefined) updateData.active = data.active
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    // If serviceIds is provided, update the many-to-many relation
    if (data.serviceIds !== undefined) {
      // Validate serviceIds belong to this tenant
      const validServices = await db.service.findMany({
        where: { id: { in: data.serviceIds }, configId: config.id },
        select: { id: true },
      })
      const safeIds = data.serviceIds.filter(id => validServices.some(s => s.id === id))

      try {
        const resource = await db.resource.update({
          where: { id },
          data: {
            ...updateData,
            services: {
              set: safeIds.map(sid => ({ id: sid })),
            },
          },
          include: {
            services: { select: { id: true } },
          },
        })
        return NextResponse.json(resource)
      } catch (setError: unknown) {
        // Fallback: update scalar fields first, then try setting services separately
        console.warn('[PUT /api/resources] services set failed, trying fallback:', setError)
        await db.resource.update({
          where: { id },
          data: updateData,
        })
        try {
          await db.resource.update({
            where: { id },
            data: {
              services: {
                set: safeIds.map(sid => ({ id: sid })),
              },
            },
          })
        } catch (fallbackErr: unknown) {
          console.warn('[PUT /api/resources] Fallback set also failed:', fallbackErr)
          // Return resource without services updated rather than failing
        }
        const resource = await db.resource.findUnique({
          where: { id },
          include: { services: { select: { id: true } } },
        })
        return NextResponse.json(resource)
      }
    }

    const resource = await db.resource.update({
      where: { id },
      data: updateData,
      include: {
        services: { select: { id: true } },
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
    const prismaErr = error as Record<string, unknown> | undefined
    const prismaCode = prismaErr?.code as string | undefined
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('PUT /api/resources/[id] error:', {
      prismaCode,
      message: errMsg,
      stack: error instanceof Error ? error.stack : undefined,
      meta: prismaErr?.meta,
    })
    return NextResponse.json({ error: "Errore nell'aggiornamento della risorsa", debug: errMsg, code: prismaCode || 'unknown' }, { status: 500 })
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
    return NextResponse.json({ error: "Errore nell'eliminazione della risorsa" }, { status: 500 })
  }
}
