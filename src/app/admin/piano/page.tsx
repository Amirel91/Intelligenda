'use client'

import { useState, useEffect } from 'react'
import { Check, Crown, Zap, CreditCard, CalendarClock, ArrowRight } from 'lucide-react'

interface PlanInfo {
  plan: string
  planExpiresAt: string | null
  stripeCustomerId: string | null
}

const PLANS = [
  {
    id: 'free',
    name: 'Gratuito',
    price: '0\u20AC',
    period: '/mese',
    description: 'Perfetto per iniziare',
    icon: Zap,
    color: 'bg-stone-100 text-stone-600',
    features: [
      'Prenotazioni online illimitate',
      'Calendario gestione',
      'Notifiche automatiche',
      'QR Code vetrina',
      'Fino a 5 servizi',
      '1 utente admin',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '19\u20AC',
    period: '/mese',
    description: 'Per professionisti in crescita',
    icon: Crown,
    color: 'bg-amber-50 text-amber-600',
    popular: true,
    features: [
      'Tutto del piano Gratuito',
      'Servizi illimitati',
      'Postazioni multipla',
      'Codici sconto',
      'Statistiche avanzate',
      'Supporto prioritario',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '39\u20AC',
    period: '/mese',
    description: 'Per strutture che scalano',
    icon: CreditCard,
    color: 'bg-blue-50 text-blue-600',
    features: [
      'Tutto del piano Pro',
      'Utenti admin multipli',
      'API personalizzate',
      'Integrazioni avanzate',
      'Brand personalizzato',
      'Account manager dedicato',
    ],
  },
] as const

export default function PianoPage() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setPlanInfo({
            plan: data.plan || 'free',
            planExpiresAt: data.planExpiresAt || null,
            stripeCustomerId: data.stripeCustomerId || null,
          })
        }
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Piano</h1>
        <p className="text-stone-500 text-sm mt-1">Gestisci il tuo abbonamento</p>
      </div>

      {/* Current plan summary */}
      {planInfo && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-8 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
            <Crown className="w-5 h-5 text-stone-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-500">Piano attuale</p>
            <p className="font-semibold text-stone-900 capitalize">
              {planInfo.plan === 'free' ? 'Gratuito' : planInfo.plan}
            </p>
          </div>
          {planInfo.planExpiresAt && (
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <CalendarClock className="w-3.5 h-3.5" />
                Scade
              </div>
              <p className="text-sm font-medium text-stone-700">
                {new Date(planInfo.planExpiresAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const isCurrent = planInfo?.plan === plan.id
          const Icon = plan.icon

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border p-6 flex flex-col transition-shadow hover:shadow-sm ${
                isCurrent
                  ? 'border-stone-900 ring-1 ring-stone-900'
                  : plan.popular
                  ? 'border-stone-300'
                  : 'border-stone-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-stone-900 text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
                  Popolare
                </div>
              )}

              <div className="mb-4">
                <div className={`w-9 h-9 rounded-lg ${plan.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-stone-900">{plan.name}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-5">
                <span className="text-2xl font-bold text-stone-900">{plan.price}</span>
                <span className="text-sm text-stone-500">{plan.period}</span>
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
                disabled={isCurrent || plan.id !== 'pro'}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'bg-stone-100 text-stone-500 cursor-default'
                    : plan.id === 'pro'
                    ? 'bg-stone-900 text-white hover:bg-stone-800'
                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isCurrent ? 'Piano attuale' : plan.id === 'pro' ? (
                  <>Inizia ora <ArrowRight className="w-3.5 h-3.5" /></>
                ) : (
                  'In arrivo'
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-stone-400 text-center mt-6">
        I piani Pro e Business saranno disponibili a breve. Contattaci per accesso anticipato.
      </p>
    </div>
  )
}
