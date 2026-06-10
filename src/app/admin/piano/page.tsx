'use client'

import { useState, useEffect } from 'react'
import { Check, Crown, Users, ArrowRight, AlertTriangle, Settings, Sparkles, Zap, Building2, MessageCircle } from 'lucide-react'
import { PLANS, PAID_PLANS, ALL_SELECTABLE_PLANS, getPlanDisplayName } from '@/lib/plans'

// Icon mapping for each plan
const PLAN_ICONS: Record<string, React.ElementType> = {
  starter: Sparkles,
  pro: Crown,
  business: Building2,
  enterprise: Building2,
  custom: Settings,
}

export default function PianoPage() {
  const [planInfo, setPlanInfo] = useState<{
    plan: string
    subscriptionStatus: string
    blocked: boolean
    blockReason: string
    trialDaysRemaining: number
    planEndDate: string | null
    maxPostazioni: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing/status')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setPlanInfo(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  const isOnTrial = planInfo?.subscriptionStatus === 'trial'
  const isBlocked = planInfo?.blocked
  const currentPlanName = planInfo?.plan ? getPlanDisplayName(planInfo.plan) : 'Free'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Piano</h1>
        <p className="text-stone-500 text-sm mt-1">Gestisci il tuo abbonamento</p>
      </div>

      {/* Trial warning banner */}
      {isOnTrial && !isBlocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Prova gratuita: {planInfo?.trialDaysRemaining} giorni rimanenti
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Scegli un piano prima della scadenza per non interrompere il servizio.
            </p>
          </div>
        </div>
      )}

      {/* Blocked warning */}
      {isBlocked && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{planInfo?.blockReason}</p>
            <p className="text-xs text-red-600 mt-0.5">
              Il tuo sito è bloccato. Seleziona un piano per riattivarlo.
            </p>
          </div>
        </div>
      )}

      {/* Current plan */}
      {planInfo && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-8 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
            <Crown className="w-5 h-5 text-stone-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-500">Piano attuale</p>
            <p className="font-semibold text-stone-900">
              {isOnTrial ? 'Prova Gratuita' : currentPlanName}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Users className="w-3.5 h-3.5" />
              Postazioni
            </div>
            <p className="text-sm font-medium text-stone-700">
              fino a {planInfo.maxPostazioni}
            </p>
          </div>
        </div>
      )}

      {/* Plans grid — 2 columns on md, 3 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_SELECTABLE_PLANS.map(plan => {
          const isCurrent = planInfo?.plan === plan.id
          const isHighlighted = plan.id === 'pro'
          const isCustom = plan.isCustom
          const IconComponent = PLAN_ICONS[plan.id] || Zap

          if (isCustom) {
            return (
              <div
                key={plan.id}
                className="relative bg-white rounded-xl border-2 border-dashed border-stone-300 hover:border-stone-400 p-6 flex flex-col transition-all duration-200 hover:shadow-sm"
              >
                <div className="mb-4">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center mb-3">
                    <Settings className="w-4 h-4 text-stone-500" />
                  </div>
                  <h3 className="font-semibold text-stone-900">{plan.name}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Più di 15 postazioni? Su misura per te.
                  </p>
                </div>

                <div className="mb-5">
                  <span className="text-xl font-bold text-stone-400">Su misura</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-stone-600">
                      <Check className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href="https://intelligenda.it/#contattaci"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Contattaci
                </a>
              </div>
            )
          }

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border p-6 flex flex-col transition-all duration-200 ${
                isHighlighted
                  ? 'border-stone-900 ring-1 ring-stone-900 shadow-sm'
                  : isCurrent
                    ? 'border-stone-400 ring-1 ring-stone-400'
                    : 'border-stone-200 hover:shadow-sm hover:border-stone-300'
              }`}
            >
              {isHighlighted && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Consigliato
                </div>
              )}
              <div className="mb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${isHighlighted ? 'bg-stone-900' : 'bg-stone-100'}`}>
                  <IconComponent className={`w-4 h-4 ${isHighlighted ? 'text-white' : 'text-stone-600'}`} />
                </div>
                <h3 className="font-semibold text-stone-900">{plan.name}</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Fino a {plan.maxPostazioni} postazioni / collaboratori
                </p>
              </div>

              <div className="mb-5">
                <span className="text-2xl font-bold text-stone-900">{plan.price}&euro;</span>
                <span className="text-sm text-stone-500"> / mese</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-stone-600">
                    <Check className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'bg-stone-100 text-stone-500 cursor-default'
                    : isHighlighted
                      ? 'bg-stone-900 text-white hover:bg-stone-800'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {isCurrent ? 'Piano attuale' : (
                  <>Scegli questo piano <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Free plan notice */}
      <div className="mt-6 bg-stone-50 rounded-xl border border-stone-200 p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-stone-400" />
          <p className="text-sm font-medium text-stone-700">Piano Free sempre disponibile</p>
        </div>
        <p className="text-xs text-stone-500">
          Se non scegli un piano a pagamento, dopo la prova passi al piano Free: 1 postazione, fino a 20 appuntamenti/mese. Zero costi, per sempre.
        </p>
      </div>

      <p className="text-xs text-stone-400 text-center mt-4">
        Tutte le funzionalità sono incluse in ogni piano. Nessuna commissione sulle prenotazioni. Disdici quando vuoi.
      </p>
    </div>
  )
}
