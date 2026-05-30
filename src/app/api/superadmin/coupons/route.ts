import { NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(coupons)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('GET /api/superadmin/coupons error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()
    const body = await request.json()
    const { code, discountAmount, extraTrialDays, expiryDate } = body
    if (!code || (!discountAmount && !extraTrialDays)) {
      return NextResponse.json({ error: 'Codice e almeno un beneficio obbligatori' }, { status: 400 })
    }
    const coupon = await db.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        extraTrialDays: extraTrialDays ? parseInt(extraTrialDays) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    })
    return NextResponse.json(coupon, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    if (error && typeof error === 'object' && 'code' in error) {
      return NextResponse.json({ error: 'Codice coupon già esistente' }, { status: 409 })
    }
    console.error('POST /api/superadmin/coupons error:', error)
    return NextResponse.json({ error: 'Errore nella creazione' }, { status: 500 })
  }
}
