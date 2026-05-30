import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { NextRequest } from 'next/server'

/**
 * GET /api/superadmin/stats
 * Returns platform-wide macro statistics.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalTenants,
      activeTenants,
      totalBookings,
      suspendedTenants,
      cancellingTenants,
      bookingsLast30Days,
      couponAggregate,
    ] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { active: true } }),
      db.booking.count(),
      db.tenant.count({ where: { active: false } }),
      db.tenant.count({ where: { subscriptionStatus: 'cancelling' } }),
      db.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.merchantCoupon.aggregate({ _sum: { usedCount: true }, _count: true }),
    ])

    // Only count tenants that are actually paying (active subscription, not trial)
    const payingTenants = await db.tenant.count({
      where: { subscriptionStatus: 'active' },
    })

    const monthlyRevenue = payingTenants * 40

    return NextResponse.json({
      totalTenants,
      activeTenants,
      suspendedTenants,
      cancellingTenants,
      totalBookings,
      bookingsLast30Days,
      monthlyRevenue,
      payingTenants,
      couponTotalUsed: couponAggregate._sum.usedCount || 0,
      couponCount: couponAggregate._count || 0,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/superadmin/stats error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento delle statistiche' }, { status: 500 })
  }
}
