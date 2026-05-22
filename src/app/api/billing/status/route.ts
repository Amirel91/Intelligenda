import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { resolveTenantSlug } from '@/lib/tenant'

/**
 * GET /api/billing/status?slug=xxx
 * Returns the subscription status for the current tenant.
 * Accepts slug via cookie (subdomain) or ?slug= query param (main domain /account).
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()

    const slug = resolveTenantSlug(request)
    if (!slug) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        businessName: true,
        subscriptionStatus: true,
        planEndDate: true,
        createdAt: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    // Determine if the plan has effectively expired
    const now = new Date()
    const isExpired = tenant.planEndDate && new Date(tenant.planEndDate) <= now
    const effectiveStatus = isExpired && tenant.subscriptionStatus === 'cancelling'
      ? 'suspended'
      : tenant.subscriptionStatus

    return NextResponse.json({
      status: effectiveStatus,
      planEndDate: tenant.planEndDate,
      isExpired,
      createdAt: tenant.createdAt,
      businessName: tenant.businessName,
    })
  } catch (error) {
    console.error('GET /api/billing/status error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento dello stato' }, { status: 500 })
  }
}
