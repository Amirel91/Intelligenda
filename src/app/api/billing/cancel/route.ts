import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { resolveTenantSlug } from '@/lib/tenant'

/**
 * POST /api/billing/cancel
 * Cancels the tenant's subscription with Nexi and records the cancel reason.
 *
 * Body:
 *   - reason: string (one of the anti-churn options)
 *   - customReason: string? (if "missing_feature" was selected)
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()

    const slug = resolveTenantSlug(request)
    if (!slug) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    const body = await request.json()
    const { reason, customReason } = body

    // Build the full cancel reason string
    let fullReason = reason || 'Non specificato'
    if (reason === 'missing_feature' && customReason) {
      fullReason = `Manca funzionalita: ${customReason}`
    }

    const tenant = await db.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    // Update tenant: mark as cancelling, save reason
    const updated = await db.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'cancelling',
        cancelReason: fullReason,
        cancelledAt: new Date(),
      },
    })

    // ============ NEXI: Request stop of recurring payments ============
    // This is the conceptual integration with Nexi XPay to stop recurring billing.
    // In production, you would call the Nexi API to cancel the subscription token.
    const NEXI_API_URL = process.env.NEXI_API_URL || ''
    const NEXI_ALIAS = process.env.NEXI_ALIAS || ''
    const NEXI_SECRET_KEY = process.env.NEXI_SECRET_KEY || ''

    if (NEXI_ALIAS && tenant.nexiSubscriptionId) {
      try {
        // Nexi XPay API: cancel recurring payment / subscription
        const cancelPayload = {
          alias: NEXI_ALIAS,
          codTrans: tenant.nexiSubscriptionId,
          // Additional fields as required by Nexi documentation
        }

        const nexiResponse = await fetch(`${NEXI_API_URL}/subscription/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cancelPayload),
        })

        if (nexiResponse.ok) {
          console.log(`[billing/cancel] Nexi subscription cancelled for tenant ${tenant.slug}`)
        } else {
          const errText = await nexiResponse.text().catch(() => 'Unknown error')
          console.error(`[billing/cancel] Nexi cancel failed for tenant ${tenant.slug}:`, errText)
          // We still proceed with the cancellation in our DB —
          // the service stays active until planEndDate regardless.
        }
      } catch (nexiErr) {
        console.error(`[billing/cancel] Nexi API call failed:`, nexiErr)
        // Non-blocking: the tenant is still marked as cancelling in our DB.
      }
    } else {
      console.log(`[billing/cancel] Nexi not configured or no subscription ID — skipping Nexi API call`)
    }

    return NextResponse.json({
      success: true,
      subscription: {
        status: updated.subscriptionStatus,
        planEndDate: updated.planEndDate,
        cancelReason: updated.cancelReason,
      },
      message: updated.planEndDate
        ? `Il servizio rimarra attivo fino al ${new Date(updated.planEndDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`
        : 'Disdetta registrata',
    })
  } catch (error) {
    console.error('POST /api/billing/cancel error:', error)
    return NextResponse.json({ error: 'Errore nella disdetta' }, { status: 500 })
  }
}
