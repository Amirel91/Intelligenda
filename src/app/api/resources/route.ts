import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'
import { z } from 'zod'

const createResourceSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(50, 'Massimo 50 caratteri'),
  serviceIds: z.array(z.string()).optional(),
})

const updateResourceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  serviceIds: z.array(z.string()).optional(),
})

// GET /api/resources — Admin: list all resources for this tenant (with assigned services)
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
        services: {
          select: { id: true },
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

    const baseData = {
      name: data.name.trim(),
      active: true,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      configId: config.id,
    }

    // Validate and filter serviceIds to only those belonging to this tenant
    let safeIds: string[] = []
    if (data.serviceIds && data.serviceIds.length > 0) {
      const validServices = await db.service.findMany({
        where: { id: { in: data.serviceIds }, configId: config.id },
        select: { id: true },
      })
      safeIds = data.serviceIds.filter(id => validServices.some(s => s.id === id))
    }

    // Strategy 1: Create resource with services connected in one query
    if (safeIds.length > 0) {
      try {
        const resource = await db.resource.create({
          data: {
            ...baseData,
            services: {
              connect: safeIds.map(id => ({ id })),
            },
          },
          include: {
            services: { select: { id: true } },
          },
        })
        return NextResponse.json(resource, { status: 201 })
      } catch (connectError: unknown) {
        // If connect fails (e.g. _ResourceService table missing),
        // fall through to Strategy 2
        const errCode = (connectError as Record<string, unknown>)?.code
        console.warn('[POST /api/resources] Connect failed, trying fallback:', errCode, connectError)
      }
    }

    // Strategy 2: Create resource without services, then connect separately
    // This is a fallback that also handles the case where _ResourceService
    // junction table might not exist yet
    const resource = await db.resource.create({
      data: baseData,
      include: {
        services: { select: { id: true } },
      },
    })

    // Try to connect services in a separate operation
    if (safeIds.length > 0) {
      try {
        await db.resource.update({
          where: { id: resource.id },
          data: {
            services: {
              connect: safeIds.map(id => ({ id })),
            },
          },
        })
        // Re-fetch to include services
        const withServices = await db.resource.findUnique({
          where: { id: resource.id },
          include: { services: { select: { id: true } } },
        })
        if (withServices) return NextResponse.json(withServices, { status: 201 })
      } catch (fallbackError: unknown) {
        // If even the fallback fails, return the resource without services
        // This is better than failing completely
        console.warn('[POST /api/resources] Fallback connect also failed:', fallbackError)
      }
    }

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
    // Extract Prisma error details for debugging
    const prismaErr = error as Record<string, unknown> | undefined
    const prismaCode = prismaErr?.code as string | undefined
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('POST /api/resources error:', {
      prismaCode,
      message: errMsg,
      stack: error instanceof Error ? error.stack : undefined,
      meta: prismaErr?.meta,
    })
    return NextResponse.json({ error: 'Errore nella creazione della risorsa', debug: errMsg, code: prismaCode || 'unknown' }, { status: 500 })
  }
}
