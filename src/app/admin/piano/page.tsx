'use client'

import { useState, useEffect } from 'react'
import { Check, Crown, Users, ArrowRight, AlertTriangle } from 'lucide-react'
import { PLANS, PAID_PLANS, getMaxPostazioni, getTrialDaysRemaining } from '@/lib/plans'

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
              Il tuo sito e bloccato. Seleziona un piano per riattivarlo.
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
            <p className="font-semibold text-stone-900 capitalize">
              {planInfo.plan === 'free' || planInfo.plan === 'trial' ? 'Prova Gratuita' : planInfo.plan}
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

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAID_PLANS.map(plan => {
          const isCurrent = planInfo?.plan === plan.id

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border p-6 flex flex-col transition-shadow hover:shadow-sm ${
                isCurrent
                  ? 'border-stone-900 ring-1 ring-stone-900'
                  : 'border-stone-200'
              }`}
            >
              <div className="mb-4">
                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center mb-3">
                  <Users className="w-4 h-4 text-stone-600" />
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

      <p className="text-xs text-stone-400 text-center mt-6">
        Tutte le funzionalita sono incluse in ogni piano. Nessuna commissione sulle prenotazioni. Disdici quando vuoi.
      </p>
    </div>
  )
}
