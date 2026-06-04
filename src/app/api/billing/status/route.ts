import { NextRequest, NextResponse } from 'next/server'
import { ensureDbSchema } from '@/lib/db'
import { getTenantSlugFromRequest, getTenantBillingStatus } from '@/lib/tenant'
import { getTrialDaysRemaining, getMaxPostazioni } from '@/lib/plans'

// GET /api/billing/status — Returns current plan, trial days remaining, limits
export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema()
    const slug = getTenantSlugFromRequest(request)
    if (!slug) {
      return NextResponse.json({ error: 'Nessun negozio' }, { status: 404 })
    }

    const status = await getTenantBillingStatus(slug)
    if (!status) {
      return NextResponse.json({ error: 'Negozio non trovato' }, { status: 404 })
    }

    const trialDays = getTrialDaysRemaining(status.planEndDate)
    const maxPostazioni = getMaxPostazioni(status.plan)

    return NextResponse.json({
      plan: status.plan,
      subscriptionStatus: status.subscriptionStatus,
      blocked: status.blocked,
      blockReason: status.reason,
      trialDaysRemaining: trialDays,
      planEndDate: status.planEndDate,
      maxPostazioni,
    })
  } catch (error) {
    console.error('GET /api/billing/status error:', error)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
