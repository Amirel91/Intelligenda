/**
 * Plan configuration and enforcement.
 *
 * Plans are based on the number of workstations (postazioni/collaboratori).
 * Trial: 30 days free, no credit card.
 * After trial expires → tenant site blocked until payment.
 */

export interface PlanTier {
  id: string           // 'trial' | 'piccola' | 'media' | 'grande'
  name: string
  price: number        // monthly price in EUR (0 for trial)
  maxPostazioni: number
  maxCollaboratori: number
  features: string[]
}

export const PLANS: Record<string, PlanTier> = {
  trial: {
    id: 'trial',
    name: 'Prova Gratuita',
    price: 0,
    maxPostazioni: 2,    // Can create up to 2 during trial
    maxCollaboratori: 1,
    features: [
      '30 giorni di prova gratuita',
      'Tutte le funzionalita incluse',
      'Fino a 2 postazioni',
    ],
  },
  piccola: {
    id: 'piccola',
    name: 'Piccola',
    price: 39,
    maxPostazioni: 2,
    maxCollaboratori: 2,
    features: [
      'Fino a 2 postazioni / collaboratori',
      'Prenotazioni online illimitate',
      'Calendario e gestione appuntamenti',
      'Notifiche automatiche',
      'QR Code vetrina',
      'Codici sconto',
      'Statistiche',
    ],
  },
  media: {
    id: 'media',
    name: 'Media',
    price: 49,
    maxPostazioni: 4,
    maxCollaboratori: 4,
    features: [
      'Fino a 4 postazioni / collaboratori',
      'Tutto del piano Piccola',
      'Tutte le funzionalita incluse',
    ],
  },
  grande: {
    id: 'grande',
    name: 'Grande',
    price: 59,
    maxPostazioni: 8,
    maxCollaboratori: 8,
    features: [
      'Fino a 8 postazioni / collaboratori',
      'Tutto del piano Media',
      'Tutte le funzionalita incluse',
    ],
  },
}

export const PAID_PLANS = [PLANS.piccola, PLANS.media, PLANS.grande]
export const TRIAL_DURATION_DAYS = 30

/**
 * Get plan tier by id. Returns trial if not found.
 */
export function getPlanTier(planId: string): PlanTier {
  return PLANS[planId] || PLANS.trial
}

/**
 * Get max postazioni allowed for a given plan.
 */
export function getMaxPostazioni(planId: string): number {
  return getPlanTier(planId).maxPostazioni
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
  if (subscriptionStatus === 'suspended') return 'Il tuo account e stato sospeso.'
  if (subscriptionStatus === 'trial') return 'Il periodo di prova gratuita di 30 giorni e terminato.'
  return 'Il tuo abbonamento e scaduto.'
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
