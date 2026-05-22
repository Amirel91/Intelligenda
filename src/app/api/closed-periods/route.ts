import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { closedPeriodSchema } from '@/lib/validations'
import { getTenantConfig, requireTenantConfig } from '@/lib/tenant'

// GET /api/closed-periods - Public: get all closed periods
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()
    const config = await getTenantConfig(request)

    if (!config) {
      return NextResponse.json([])
    }

    const closedPeriods = await db.closedPeriod.findMany({
      where: { configId: config.id },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json(closedPeriods)
  } catch (error) {
    console.error('GET /api/closed-periods error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento dei periodi di chiusura' }, { status: 500 })
  }
}

// POST /api/closed-periods - Admin: add a closed period
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const body = await request.json()
    const data = closedPeriodSchema.parse(body)

    const config = await requireTenantConfig(request)

    const closedPeriod = await db.closedPeriod.create({
      data: {
        configId: config.id,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason || '',
      },
    })

    return NextResponse.json(closedPeriod, { status: 201 })
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
    console.error('POST /api/closed-periods error:', error)
    return NextResponse.json({ error: "Errore nell'aggiunta del periodo di chiusura" }, { status: 500 })
  }
}

// DELETE /api/closed-periods?id=xxx - Admin: remove a closed period
export async function DELETE(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Specificare id' }, { status: 400 })
    }

    const config = await requireTenantConfig(request)
    const closedPeriod = await db.closedPeriod.findUnique({ where: { id } })

    if (!closedPeriod || closedPeriod.configId !== config.id) {
      return NextResponse.json({ error: 'Periodo di chiusura non trovato' }, { status: 404 })
    }

    await db.closedPeriod.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    console.error('DELETE /api/closed-periods error:', error)
    return NextResponse.json({ error: 'Errore nella rimozione del periodo di chiusura' }, { status: 500 })
  }
}
