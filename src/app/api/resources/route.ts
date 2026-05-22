import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'
import { z } from 'zod'

const createResourceSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(50, 'Massimo 50 caratteri'),
})

const updateResourceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// GET /api/resources — Admin: list all resources for this tenant
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const config = await requireTenantConfig(request)

    const resources = await db.resource.findMany({
      where: { configId: config.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['confirmed', 'pending'] },
                startTime: { gte: new Date() },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(resources)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    console.error('GET /api/resources error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento delle risorse' }, { status: 500 })
  }
}

// POST /api/resources — Admin: create a new resource
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const config = await requireTenantConfig(request)

    const body = await request.json()
    const data = createResourceSchema.parse(body)

    // Get next sort order
    const maxOrder = await db.resource.findFirst({
      where: { configId: config.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const resource = await db.resource.create({
      data: {
        name: data.name.trim(),
        active: true,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
        configId: config.id,
      },
    })

    return NextResponse.json(resource, { status: 201 })
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
    console.error('POST /api/resources error:', error)
    return NextResponse.json({ error: 'Errore nella creazione della risorsa' }, { status: 500 })
  }
}
