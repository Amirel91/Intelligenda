import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()

    const config = await requireTenantConfig(request)

    // Rome-aware today start
    const romeNow = new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' })
    const todayStart = new Date(romeNow)
    todayStart.setHours(0, 0, 0, 0)

    // Run all queries in parallel
    const [todayBookings, totalBookings, allRevenue, ratingStats] = await Promise.all([
      db.booking.findMany({
        where: {
          configId: config.id,
          startTime: { gte: todayStart },
          status: { in: ['confirmed', 'pending'] },
        },
        include: { services: { include: { service: true } } },
      }),
      db.booking.count({
        where: { configId: config.id, status: { in: ['confirmed', 'pending'] } },
      }),
      db.booking.aggregate({
        where: { configId: config.id, status: { in: ['confirmed', 'pending'] } },
        _sum: { totalPrice: true },
      }),
      // Rating: average + total count for this tenant
      db.feedback.aggregate({
        where: {
          booking: { configId: config.id },
        },
        _avg: { rating: true },
        _count: true,
      }),
    ])

    const revenue = todayBookings.reduce((sum, b) => sum + b.totalPrice, 0)

    // Top services
    const serviceCount: Record<string, { name: string; count: number; revenue: number }> = {}
    for (const b of todayBookings) {
      for (const bs of b.services) {
        if (!serviceCount[bs.service.name]) {
          serviceCount[bs.service.name] = { name: bs.service.name, count: 0, revenue: 0 }
        }
        serviceCount[bs.service.name].count++
        serviceCount[bs.service.name].revenue += bs.service.price
      }
    }
    const topServices = Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 5)

    return NextResponse.json({
      bookingsCount: todayBookings.length,
      revenue,
      totalBookings,
      totalRevenue: allRevenue._sum.totalPrice || 0,
      topServices,
      ratingAverage: ratingStats._avg.rating ? Math.round(ratingStats._avg.rating * 10) / 10 : null,
      ratingCount: ratingStats._count,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'TenantNotFound') {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
