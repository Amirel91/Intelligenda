import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

// GET /api/coupon/admin — list all coupons for this tenant
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const config = await requireTenantConfig(request)

    const coupons = await db.merchantCoupon.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(coupons)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/coupon/admin error:', error)
    return NextResponse.json({ error: 'Errore nel caricamento dei coupon' }, { status: 500 })
  }
}

// POST /api/coupon/admin — create a new coupon
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const config = await requireTenantConfig(request)

    const body = await request.json()
    const { code, discountAmount, maxUses, isActive, expiresAt } = body

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Il codice e obbligatorio' }, { status: 400 })
    }

    const parsedDiscount = parseFloat(discountAmount)
    if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
      return NextResponse.json({ error: 'L\'importo dello sconto deve essere positivo' }, { status: 400 })
    }

    // Check uniqueness within tenant
    const existing = await db.merchantCoupon.findFirst({
      where: { configId: config.id, code: code.trim().toUpperCase() },
    })
    if (existing) {
      return NextResponse.json({ error: 'Esiste gia un coupon con questo codice' }, { status: 409 })
    }

    const coupon = await db.merchantCoupon.create({
      data: {
        configId: config.id,
        code: code.trim().toUpperCase(),
        discountAmount: parsedDiscount,
        maxUses: parseInt(maxUses) || 100,
        isActive: isActive !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json(coupon, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('POST /api/coupon/admin error:', error)
    return NextResponse.json({ error: 'Errore nella creazione del coupon' }, { status: 500 })
  }
}
