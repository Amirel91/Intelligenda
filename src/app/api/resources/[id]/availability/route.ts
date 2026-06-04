import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'
import { z } from 'zod'

const availabilitySchema = z.object({
  days: z.array(z.object({
    dayOfWeek: z.number().int().min(1).max(7),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    closed: z.boolean(),
  })).length(7),
})

// GET /api/resources/[id]/availability
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const config = await requireTenantConfig(request)
    const { id } = await params

    // Verify resource belongs to this tenant
    const resource = await db.resource.findFirst({
      where: { id, configId: config.id },
    })
    if (!resource) {
      return NextResponse.json({ error: 'Risorsa non trovata' }, { status: 404 })
    }

    const availability = await db.resourceAvailability.findMany({
      where: { resourceId: id },
      orderBy: { dayOfWeek: 'asc' },
    })

    // Always return all 7 days (fill missing as closed)
    const days = []
    for (let d = 1; d <= 7; d++) {
      const existing = availability.find(a => a.dayOfWeek === d)
      days.push(existing || {
        id: '',
        resourceId: id,
        dayOfWeek: d,
        openTime: '09:00',
        closeTime: '18:00',
        closed: true,
      })
    }

    return NextResponse.json({ days })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    console.error('GET /api/resources/[id]/availability error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento della disponibilita' }, { status: 500 })
  }
}

// PUT /api/resources/[id]/availability — upsert all 7 days
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const config = await requireTenantConfig(request)
    const { id } = await params

    const resource = await db.resource.findFirst({
      where: { id, configId: config.id },
    })
    if (!resource) {
      return NextResponse.json({ error: 'Risorsa non trovata' }, { status: 404 })
    }

    const body = await request.json()
    const data = availabilitySchema.parse(body)

    // Delete existing and recreate
    await db.resourceAvailability.deleteMany({ where: { resourceId: id } })

    // Only create records for non-closed days
    const createData = data.days
      .filter(d => !d.closed)
      .map(d => ({
        resourceId: id,
        dayOfWeek: d.dayOfWeek,
        openTime: d.openTime,
        closeTime: d.closeTime,
        closed: false,
      }))

    if (createData.length > 0) {
      await db.resourceAvailability.createMany({ data: createData })
    }

    return NextResponse.json({ success: true })
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
    console.error('PUT /api/resources/[id]/availability error:', error)
    return NextResponse.json({ error: "Errore nell'aggiornamento della disponibilita" }, { status: 500 })
  }
}
