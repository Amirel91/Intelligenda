import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { requireTenantConfig } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

// PATCH /api/coupon/admin/[id] — update coupon
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const config = await requireTenantConfig(request)
    const { id } = await params

    const body = await request.json()
    const { isActive, maxUses, discountAmount, expiresAt } = body

    // Verify coupon belongs to this tenant
    const existing = await db.merchantCoupon.findFirst({
      where: { id, configId: config.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Coupon non trovato' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof maxUses === 'number') updateData.maxUses = maxUses
    if (typeof discountAmount === 'number' && discountAmount > 0) updateData.discountAmount = discountAmount
    if (expiresAt === null) {
      updateData.expiresAt = null
    } else if (expiresAt) {
      updateData.expiresAt = new Date(expiresAt)
    }

    const updated = await db.merchantCoupon.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('PATCH /api/coupon/admin/[id] error:', error)
    return NextResponse.json({ error: 'Errore nell\'aggiornamento del coupon' }, { status: 500 })
  }
}

// DELETE /api/coupon/admin/[id] — delete coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbSchema()
    await requireAdmin()
    const config = await requireTenantConfig(request)
    const { id } = await params

    // Verify coupon belongs to this tenant
    const existing = await db.merchantCoupon.findFirst({
      where: { id, configId: config.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Coupon non trovato' }, { status: 404 })
    }

    // Don't allow deleting coupons that have been used
    if (existing.usedCount > 0) {
      return NextResponse.json(
        { error: 'Non puoi eliminare un coupon che e stato gia utilizzato. Disattivalo invece.' },
        { status: 400 }
      )
    }

    await db.merchantCoupon.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('DELETE /api/coupon/admin/[id] error:', error)
    return NextResponse.json({ error: 'Errore nell\'eliminazione del coupon' }, { status: 500 })
  }
}
