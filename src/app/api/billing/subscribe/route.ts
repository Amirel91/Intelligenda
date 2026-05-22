import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDbSchema } from '@/lib/db'
import { resolveTenantSlug } from '@/lib/tenant'

/**
 * POST /api/billing/subscribe
 * Initiates a Nexi XPay subscription for the current tenant.
 *
 * Flow:
 * 1. Look up tenant from slug
 * 2. Create or retrieve nexiCustomerId
 * 3. Build Nexi XPay API request (conceptual — real API keys needed)
 * 4. Return payment URL to redirect the customer
 */

const NEXI_API_URL = process.env.NEXI_API_URL || 'https://ecommerce.nexi.it/ecomm/api/v1'
const NEXI_ALIAS = process.env.NEXI_ALIAS || ''
const NEXI_SECRET_KEY = process.env.NEXI_SECRET_KEY || ''

const PLAN_AMOUNT = 40 // EUR/month
const CURRENCY = 'EUR'

/**
 * Generate Nexi XPay MAC (Message Authentication Code)
 * The MAC is computed over the sorted concatenation of specific fields + secret key.
 */
function computeNexiMac(fields: Record<string, string>): string {
  const sortedKeys = Object.keys(fields).sort()
  const concatenated = sortedKeys.map(k => `${k}=${fields[k]}`).join('&')
  // In production, this would use SHA-256 with the NEXI_SECRET_KEY
  // For now, we return a placeholder — the actual implementation requires
  // the Nexi SDK or manual HMAC-SHA256 computation.
  return Buffer.from(concatenated).toString('base64')
}

/**
 * Build the Nexi XPay payment/subscription request payload.
 */
function buildNexiPayload(tenantId: string, tenantName: string, returnUrl: string): Record<string, string> {
  const orderId = `IG-${tenantId}-${Date.now()}`
  const payload: Record<string, string> = {
    alias: NEXI_ALIAS,
    codTrans: orderId,
    divisa: CURRENCY,
    importo: String(PLAN_AMOUNT * 100), // Nexi expects amount in cents
    tipoServizio: 'pago_dopo',          // Subscription-type payment
    'descrizione': `Abbonamento IntelliGenda — ${tenantName}`,
    urlOk: `${returnUrl}?result=ok&orderId=${orderId}`,
    urlKo: `${returnUrl}?result=ko&orderId=${orderId}`,
    urlRendito: `${returnUrl}?result=refund&orderId=${orderId}`,
    // Recurring fields (conceptual)
    'parametriRinnovo[nRinnovi]': '0',  // Unlimited renewals
    'parametriRinnovo[scadenza]': 'P1M', // Monthly renewal
  }

  payload.mac = computeNexiMac(payload)

  return payload
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema()

    const slug = resolveTenantSlug(request)
    if (!slug) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    const tenant = await db.tenant.findUnique({
      where: { slug },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 })
    }

    // If no Nexi API credentials configured, return a demo response
    if (!NEXI_ALIAS || !NEXI_SECRET_KEY) {
      console.warn('[billing/subscribe] Nexi API credentials not configured — returning demo mode')

      // Demo mode: simulate a successful subscription
      const planEndDate = new Date()
      planEndDate.setDate(planEndDate.getDate() + 30)

      const updated = await db.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionStatus: 'active',
          planEndDate,
          nexiCustomerId: `demo_nexi_${tenant.id}`,
          nexiSubscriptionId: `demo_sub_${Date.now()}`,
        },
      })

      return NextResponse.json({
        success: true,
        demoMode: true,
        message: 'Abbonamento attivato in modalita demo (Nexi non configurato)',
        subscription: {
          status: updated.subscriptionStatus,
          planEndDate: updated.planEndDate,
        },
      })
    }

    // ============ PRODUCTION: Real Nexi XPay integration ============

    const origin = request.headers.get('origin') || 'https://intelligenda.it'
    const returnUrl = `${origin}/account?billing=callback`

    const payload = buildNexiPayload(tenant.id, tenant.businessName, returnUrl)

    // Call Nexi API to initiate payment
    const nexiResponse = await fetch(`${NEXI_API_URL}/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!nexiResponse.ok) {
      const errData = await nexiResponse.json().catch(() => ({}))
      console.error('[billing/subscribe] Nexi API error:', errData)
      return NextResponse.json(
        { error: 'Errore nella comunicazione con Nexi. Riprova piu tardi.' },
        { status: 502 }
      )
    }

    const nexiData = await nexiResponse.json()

    // If Nexi returns a payment URL, redirect the customer there
    if (nexiData.paymentUrl || nexiData.redirectUrl) {
      return NextResponse.json({
        success: true,
        demoMode: false,
        paymentUrl: nexiData.paymentUrl || nexiData.redirectUrl,
        orderId: payload.codTrans,
      })
    }

    // Alternative: Nexi might return a hosted page URL
    if (nexiData.url) {
      return NextResponse.json({
        success: true,
        demoMode: false,
        paymentUrl: nexiData.url,
        orderId: payload.codTrans,
      })
    }

    // If Nexi confirms subscription directly
    if (nexiData.esito === 'OK') {
      const planEndDate = new Date()
      planEndDate.setDate(planEndDate.getDate() + 30)

      await db.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionStatus: 'active',
          planEndDate,
          nexiCustomerId: nexiData.codCliente || `nexi_${tenant.id}`,
          nexiSubscriptionId: nexiData.numContratto || payload.codTrans,
        },
      })

      return NextResponse.json({
        success: true,
        demoMode: false,
        subscription: {
          status: 'active',
          planEndDate,
        },
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Risposta Nexi non riconosciuta',
      nexiResponse: nexiData,
    }, { status: 502 })

  } catch (error) {
    console.error('POST /api/billing/subscribe error:', error)
    return NextResponse.json({ error: 'Errore nella sottoscrizione' }, { status: 500 })
  }
}
