import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getTenantConfig } from '@/lib/tenant'

/**
 * GET /api/resources/public?serviceIds=id1,id2,id3
 *
 * Public endpoint for the client booking flow.
 * Returns active resources that can perform ALL of the requested services.
 * Resources with NO services assigned are always included (backward compat = "does everything").
 * Resources WITH services assigned are included only if ALL requested serviceIds are in their list.
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()

    const { searchParams } = new URL(request.url)
    const serviceIdsParam = searchParams.get('serviceIds')

    const config = await getTenantConfig(request)
    if (!config) {
      return NextResponse.json([])
    }

    const resources = await db.resource.findMany({
      where: { configId: config.id, active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        services: { select: { id: true } },
      },
    })

    // If no serviceIds filter, return all active resources
    if (!serviceIdsParam) {
      return NextResponse.json(resources.map(r => ({ id: r.id, name: r.name })))
    }

    const requestedServiceIds = new Set(serviceIdsParam.split(',').filter(Boolean))

    // Filter: include resource if it has NO services (universal) or ALL requested services
    const filtered = resources.filter(r => {
      const assignedIds = new Set(r.services.map(s => s.id))
      // No services assigned → universal → include
      if (assignedIds.size === 0) return true
      // Check all requested serviceIds are in the assigned set
      for (const sid of requestedServiceIds) {
        if (!assignedIds.has(sid)) return false
      }
      return true
    })

    return NextResponse.json(filtered.map(r => ({ id: r.id, name: r.name })))
  } catch (error) {
    console.error('GET /api/resources/public error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento delle risorse' }, { status: 500 })
  }
}
