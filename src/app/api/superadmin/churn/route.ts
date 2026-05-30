import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const tenants = await db.tenant.findMany({
      where: { slug: { not: 'default' } },
      include: {
        admins: { select: { lastLoginAt: true } },
        config: {
          select: {
            bookings: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    const now = new Date()
    const churnData = tenants.map(t => {
      const lastBooking = t.config?.bookings?.[0]?.createdAt
      const lastAdminLogin = t.admins.reduce<Date | null>((latest, a) => {
        if (!a.lastLoginAt) return latest
        if (!latest) return a.lastLoginAt
        return a.lastLoginAt > latest ? a.lastLoginAt : latest
      }, null)
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
        subscriptionStatus: t.subscriptionStatus,
        lastBookingAt: lastBooking,
        lastAdminLoginAt: lastAdminLogin,
        lastActivity: lastActivity,
        daysInactive,
        isAtRisk: daysInactive > 14,
        isWarning: daysInactive > 7 && daysInactive <= 14,
      }
    }).filter(t => t.daysInactive > 7).sort((a, b) => b.daysInactive - a.daysInactive)
    return NextResponse.json(churnData)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/superadmin/churn error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
