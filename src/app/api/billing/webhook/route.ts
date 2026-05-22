import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'

/**
 * POST /api/billing/webhook
 * Receives webhook notifications from Nexi XPay.
 *
 * Expected payloads:
 *   - payment.success: Subscription payment succeeded → extend planEndDate
 *   - payment.failed: Payment failed → tenant notified
 *   - subscription.cancelled: Nexi confirmed cancellation
 *
 * Security: In production, validate the Nexi MAC/signature on every webhook.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()

    const body = await request.json()
    const { event, data } = body

    // ============ SECURITY: Validate Nexi webhook signature ============
    // In production, verify the MAC using NEXI_SECRET_KEY
    const nexiSignature = request.headers.get('x-nexi-signature') || ''
    if (!nexiSignature) {
      console.warn('[billing/webhook] Missing Nexi signature — rejecting')
      return NextResponse.json({ error: 'Signature mancante' }, { status: 401 })
    }

    const isValid = validateNexiSignature(request, nexiSignature)
    if (!isValid) {
      console.warn('[billing/webhook] Invalid Nexi signature — rejecting')
      return NextResponse.json({ error: 'Firma non valida' }, { status: 401 })
    }

    // ============ HANDLE EVENTS ============

    switch (event) {
      case 'payment.success': {
        // Successful recurring payment — extend planEndDate by 30 days
        const { codTrans, nexiCustomerId } = data

        if (!codTrans || !nexiCustomerId) {
          return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 })
        }

        // Find tenant by Nexi customer ID
        const tenant = await db.tenant.findFirst({
          where: { nexiCustomerId },
        })

        if (!tenant) {
          console.error(`[billing/webhook] Tenant not found for nexiCustomerId: ${nexiCustomerId}`)
          return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
        }

        // Extend planEndDate by 30 days from current end date (or from now if null/expired)
        const base = tenant.planEndDate && new Date(tenant.planEndDate) > new Date()
          ? new Date(tenant.planEndDate)
          : new Date()
        const newPlanEnd = new Date(base)
        newPlanEnd.setDate(newPlanEnd.getDate() + 30)

        await db.tenant.update({
          where: { id: tenant.id },
          data: {
            planEndDate: newPlanEnd,
            // If was cancelling, reactivate since they paid again
            subscriptionStatus: 'active',
            cancelReason: null,
            cancelledAt: null,
          },
        })

        console.log(`[billing/webhook] Extended plan for ${tenant.slug} until ${newPlanEnd.toISOString()}`)

        return NextResponse.json({ success: true, newPlanEndDate: newPlanEnd })
      }

      case 'payment.failed': {
        // Payment failed — log it, but don't suspend yet
        // The tenant stays active until planEndDate expires
        const { nexiCustomerId } = data

        const tenant = nexiCustomerId
          ? await db.tenant.findFirst({ where: { nexiCustomerId } })
          : null

        if (tenant) {
          console.warn(`[billing/webhook] Payment failed for ${tenant.slug} — current planEndDate: ${tenant.planEndDate}`)
        }

        // Could send notification email to the tenant here

        return NextResponse.json({ success: true, message: 'Payment failure logged' })
      }

      case 'subscription.cancelled': {
        // Nexi confirmed the subscription was cancelled
        const { nexiCustomerId } = data

        const tenant = nexiCustomerId
          ? await db.tenant.findFirst({ where: { nexiCustomerId } })
          : null

        if (tenant) {
          await db.tenant.update({
            where: { id: tenant.id },
            data: {
              subscriptionStatus: 'cancelling',
            },
          })
          console.log(`[billing/webhook] Subscription cancelled confirmed for ${tenant.slug}`)
        }

        return NextResponse.json({ success: true })
      }

      default:
        console.warn(`[billing/webhook] Unknown event type: ${event}`)
        return NextResponse.json({ error: 'Evento non riconosciuto' }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/billing/webhook error:', error)
    return NextResponse.json({ error: 'Errore webhook' }, { status: 500 })
  }
}

/**
 * Validate Nexi webhook signature.
 * In production, this computes the MAC from the request body and compares
 * it against the x-nexi-signature header using NEXI_SECRET_KEY.
 */
function validateNexiSignature(request: NextRequest, signature: string): boolean {
  // In demo mode, accept any signature
  if (!process.env.NEXI_SECRET_KEY) {
    return true
  }

  // In production, implement proper MAC validation:
  // 1. Get raw body
  // 2. Compute HMAC-SHA256 with NEXI_SECRET_KEY
  // 3. Compare with signature
  // For now, we accept all signatures as valid when NEXI_SECRET_KEY is set
  // This MUST be replaced with actual cryptographic validation before production use
  console.warn('[billing/webhook] Signature validation not fully implemented — accepting all')
  return !!signature
}
