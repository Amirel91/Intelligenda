import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { PLANS } from '@/lib/plans'

const VALID_PLANS = Object.keys(PLANS)
const VALID_STATUSES = ['trial', 'active', 'cancelling', 'suspended']

/**
 * PATCH /api/superadmin/tenants/[id]
 * Toggle tenant active/suspended status OR change plan/subscription.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    const { id } = await params
    const body = await request.json()

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: { config: true },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    // ---- Plan change (SuperAdmin grant) ----
    if (body.plan !== undefined) {
      const planId = body.plan
      if (!VALID_PLANS.includes(planId)) {
        return NextResponse.json(
          { error: `Piano non valido. Valori ammessi: ${VALID_PLANS.join(', ')}` },
          { status: 400 },
        )
      }

      const subscriptionStatus = body.subscriptionStatus || 'active'
      const planEndDate = body.planEndDate || null // ISO string or null (permanent)

      // Build update data
      const tenantUpdate: Record<string, unknown> = {
        subscriptionStatus,
      }
      if (planEndDate) {
        tenantUpdate.planEndDate = new Date(planEndDate)
      } else {
        tenantUpdate.planEndDate = null // Permanent — no expiry
      }

      // If the plan was cancelling, clear cancelReason
      if (subscriptionStatus !== 'cancelling') {
        tenantUpdate.cancelReason = null
        tenantUpdate.cancelledAt = null
      }

      // Ensure BusinessConfig exists
      let config = tenant.config
      if (!config) {
        config = await db.businessConfig.create({
          data: { tenantId: id, plan: planId },
        })
      } else {
        await db.businessConfig.update({
          where: { tenantId: id },
          data: {
            plan: planId,
            planExpiresAt: planEndDate ? new Date(planEndDate) : null,
          },
        })
      }

      const updated = await db.tenant.update({
        where: { id },
        data: tenantUpdate,
      })

      return NextResponse.json({
        id: updated.id,
        slug: updated.slug,
        businessName: updated.businessName,
        active: updated.active,
        plan: planId,
        subscriptionStatus: updated.subscriptionStatus,
        planEndDate: updated.planEndDate,
      })
    }

    // ---- Simple active toggle (legacy behavior) ----
    const { active } = body
    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'Nessuna azione valida specificata' }, { status: 400 })
    }

    const updated = await db.tenant.update({
      where: { id },
      data: { active },
    })

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      businessName: updated.businessName,
      active: updated.active,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('PATCH /api/superadmin/tenants/[id] error:', error)
    return NextResponse.json({ error: "Errore nell'aggiornamento del tenant" }, { status: 500 })
  }
}

/**
 * DELETE /api/superadmin/tenants/[id]
 * Permanently delete a tenant and all related data (cascade).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request)
    await ensureDbSchema()

    const { id } = await params

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: { config: true },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    await db.tenant.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      deletedTenant: {
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.businessName,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'SuperAdminUnauthorized') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    console.error('DELETE /api/superadmin/tenants/[id] error:', error)
    return NextResponse.json({ error: "Errore nell'eliminazione del tenant" }, { status: 500 })
  }
}