import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { NextRequest } from 'next/server'

/**
 * GET /api/superadmin/tenants
 * Lists all tenants with their booking count.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    // Tenant has no direct 'bookings' relation — bookings live on BusinessConfig.
    // We count bookings through the config relation.
    const tenants = await db.tenant.findMany({
      include: {
        _count: {
          select: {
            admins: true,
          },
        },
        admins: {
          select: { lastLoginAt: true },
          orderBy: { lastLoginAt: 'desc' },
          take: 1,
        },
        config: {
          select: {
            id: true,
            plan: true,
            planExpiresAt: true,
            _count: {
              select: {
                bookings: true,
              },
            },
            bookings: {
              select: { createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const mapped = tenants.map(t => {
      const lastBooking = t.config?.bookings?.[0]?.createdAt
      const lastAdminLogin = t.admins?.[0]?.lastLoginAt
      const lastActivity = [lastBooking, lastAdminLogin, t.updatedAt]
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
      const daysInactive = lastActivity
        ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: t.id,
        slug: t.slug,
        businessName: t.businessName,
        ownerName: t.ownerName,
        ownerEmail: t.ownerEmail,
        active: t.active,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        bookingCount: t.config?._count?.bookings ?? 0,
        adminCount: t._count.admins,
        hasConfig: !!t.config,
        // Billing fields
        subscriptionStatus: t.subscriptionStatus,
        plan: t.config?.plan || 'free',
        configPlanExpiresAt: t.config?.planExpiresAt || null,
        planEndDate: t.planEndDate,
        cancelReason: t.cancelReason,
        cancelledAt: t.cancelledAt,
        // Churn monitoring
        lastActivity,
        daysInactive,
        isAtRisk: daysInactive > 14,
        isWarning: daysInactive > 7,
      }
    })

    return NextResponse.json(mapped)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/superadmin/tenants error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento dei tenant' }, { status: 500 })
  }
}
