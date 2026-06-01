import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { getTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/**
 * GET /api/coupon/validate?code=SCONTO10
 *
 * Public endpoint: validates a merchant coupon code for the current tenant.
 * Returns discount amount if valid, error otherwise.
 *
 * Response: { valid: true, discountAmount: 10.0, code: "SCONTO10" }
 *        or { valid: false, error: "..." }
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim().toUpperCase()

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Codice sconto mancante' }, { status: 400 })
    }

    const config = await getTenantConfig(request)
    if (!config) {
      return NextResponse.json({ valid: false, error: 'Negozio non trovato' }, { status: 404 })
    }

    // Find coupon for this tenant
    const coupon = await db.merchantCoupon.findFirst({
      where: {
        configId: config.id,
        code,
        isActive: true,
      },
    })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Codice sconto non valido' })
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Questo codice sconto e scaduto' })
    }

    // Check usage limit
    if (coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: 'Questo codice sconto ha raggiunto il limite di utilizzi' })
    }

    return NextResponse.json({
      valid: true,
      discountAmount: coupon.discountAmount,
      code: coupon.code,
    })
  } catch (error) {
    console.error('GET /api/coupon/validate error:', error)
    return NextResponse.json({ valid: false, error: 'Errore nella verifica del codice' }, { status: 500 })
  }
}
