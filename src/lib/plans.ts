/**
 * Plan configuration and enforcement.
 *
 * Plans are based on the number of workstations (postazioni/collaboratori).
 * Free: always free, max 1 postazione, 20 appuntamenti/mese.
 * Trial: 30 days free with full features (up to 4 postazioni), no credit card.
 * After trial expires → tenant site blocked until payment.
 *
 * Feature list is the same across all plans — only the workstation limit and price differ.
 */

export interface PlanTier {
  id: string
  name: string
  price: number        // monthly price in EUR (0 for free/trial)
  maxPostazioni: number
  features: string[]
  isCustom?: boolean
  maxAppuntamenti?: number  // null = unlimited
}

// Shared features (identical for every paid plan)
const PAID_FEATURES: string[] = [
  'Sottodominio dedicato',
  'Zero commissioni sulle prenotazioni',
  'Disdici quando vuoi',
]

export const PLANS: Record<string, PlanTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    maxPostazioni: 1,
    maxAppuntamenti: 20,
    features: [
      'Fino a 20 appuntamenti/mese',
      '1 postazione',
      'Sottodominio dedicato',
      'Tutte le funzionalità',
      'Zero commissioni',
    ],
  },
  trial: {
    id: 'trial',
    name: 'Prova Gratuita',
    price: 0,
    maxPostazioni: 4,    // Full features during trial
    features: [
      '30 giorni di prova gratuita',
      'Tutte le funzionalità incluse',
      'Fino a 4 postazioni',
      'Sottodominio dedicato',
      'Assistenza inclusa',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 39,
    maxPostazioni: 2,
    features: [
      'Appuntamenti illimitati',
      'Fino a 2 postazioni/dipendenti',
      ...PAID_FEATURES,
      'Assistenza inclusa',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    maxPostazioni: 4,
    features: [
      'Appuntamenti illimitati',
      'Fino a 4 postazioni/dipendenti',
      ...PAID_FEATURES,
      'Assistenza prioritaria',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 69,
    maxPostazioni: 8,
    features: [
      'Appuntamenti illimitati',
      'Fino a 8 postazioni/dipendenti',
      ...PAID_FEATURES,
      'Assistenza prioritaria',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 89,
    maxPostazioni: 15,
    features: [
      'Appuntamenti illimitati',
      'Fino a 15 postazioni/dipendenti',
      ...PAID_FEATURES,
      'Assistenza dedicata',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    price: -1,  // -1 = price on request
    maxPostazioni: 999,
    isCustom: true,
    features: [
      'Postazioni illimitate',
      'Integrazioni personalizzate',
      'Assistenza dedicata',
      'Prezzo definito insieme',
      'Contratto personalizzato',
    ],
  },
}

/** All paid plans (shown in admin piano page) */
export const PAID_PLANS = [PLANS.starter, PLANS.pro, PLANS.business, PLANS.enterprise]

/** All selectable plans (paid + custom, for admin UI) */
export const ALL_SELECTABLE_PLANS = [...PAID_PLANS, PLANS.custom]

/** Free plan reference (after trial expires, tenant drops to this) */
export const FREE_PLAN = PLANS.free

export const TRIAL_DURATION_DAYS = 30

/**
 * Get plan tier by id. Returns free if not found.
 */
export function getPlanTier(planId: string): PlanTier {
  return PLANS[planId] || PLANS.free
}

/**
 * Get max postazioni allowed for a given plan.
 */
export function getMaxPostazioni(planId: string): number {
  return getPlanTier(planId).maxPostazioni
}

/**
 * Get display name for a plan (handles free/trial special cases).
 */
export function getPlanDisplayName(planId: string): string {
  if (planId === 'free' || planId === 'trial') return 'Free'
  return getPlanTier(planId).name
}

/**
 * Check if tenant trial has expired.
 * Returns true if trial period is over AND tenant is still on trial.
 */
export function isTrialExpired(subscriptionStatus: string, planEndDate?: string | Date | null): boolean {
  if (subscriptionStatus !== 'trial') return false
  if (!planEndDate) return false
  return new Date(planEndDate) <= new Date()
}

/**
 * Check if tenant access should be blocked.
 * Blocked if: suspended, trial expired, or cancelling with expired plan.
 */
export function isTenantBlocked(
  subscriptionStatus: string,
  planEndDate?: string | Date | null
): boolean {
  if (subscriptionStatus === 'suspended') return true

  // Trial expired → block
  if (subscriptionStatus === 'trial' && planEndDate && new Date(planEndDate) <= new Date()) {
    return true
  }

  // Cancelling with expired plan → block
  if (subscriptionStatus === 'cancelling' && planEndDate && new Date(planEndDate) <= new Date()) {
    return true
  }

  return false
}

/**
 * Get the reason for blocking (for display to the user).
 */
export function getBlockReason(subscriptionStatus: string, planEndDate?: string | Date | null): string {
  if (subscriptionStatus === 'suspended') return 'Il tuo account è stato sospeso.'
  if (subscriptionStatus === 'trial') return 'Il periodo di prova gratuita di 30 giorni è terminato.'
  return 'Il tuo abbonamento è scaduto.'
}

/**
 * Get days remaining in trial. Returns 0 if not on trial or expired.
 */
export function getTrialDaysRemaining(planEndDate?: string | Date | null): number {
  if (!planEndDate) return 0
  const end = new Date(planEndDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
