'use client'

import { useState, useEffect } from 'react'
import { Lock, Clock, ArrowRight } from 'lucide-react'

interface BillingStatus {
  plan: string
  subscriptionStatus: string
  blocked: boolean
  blockReason: string
  trialDaysRemaining: number
  planEndDate: string | null
  maxPostazioni: number
}

export default function SuspendedPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)

  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => setStatus(data))
      .catch(() => {})
  }, [])

  const isTrialExpired = status?.subscriptionStatus === 'trial'
  const isVercelDomain = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
  const adminUrl = status
    ? isVercelDomain
      ? `${window.location.origin}/t/${window.location.pathname === '/suspended' ? '' : ''}/admin/piano`
      : `https://${window.location.hostname}/admin/piano`
    : '/admin/piano'

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          {isTrialExpired ? (
            <Clock className="w-8 h-8 text-amber-600" />
          ) : (
            <Lock className="w-8 h-8 text-amber-600" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          {isTrialExpired ? 'Prova gratuita terminata' : 'Abbonamento scaduto'}
        </h1>

        <p className="text-stone-500 mb-8 leading-relaxed">
          {isTrialExpired
            ? 'Il tuo periodo di prova gratuita di 30 giorni e terminato. Scegli un piano per continuare a utilizzare IntelliGenda e accettare prenotazioni dai tuoi clienti.'
            : 'Il tuo abbonamento e scaduto. Rinnova il tuo piano per riattivare il tuo negozio.'}
        </p>

        {/* Plans summary */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { name: 'Piccola', price: '39', max: 2 },
            { name: 'Media', price: '49', max: 4 },
            { name: 'Grande', price: '59', max: 8 },
          ].map(p => (
            <div key={p.name} className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs text-stone-400 font-medium">{p.name}</p>
              <p className="text-lg font-bold text-stone-900 mt-1">
                {p.price}&euro;<span className="text-xs font-normal text-stone-400">/mese</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-1">fino a {p.max} postazioni</p>
            </div>
          ))}
        </div>

        <a
          href={adminUrl}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-2xl text-base font-medium hover:bg-stone-800 transition-colors"
        >
          Scegli il tuo piano <ArrowRight className="w-5 h-5" />
        </a>

        <p className="text-xs text-stone-400 mt-6">
          Tutte le funzionalita sono incluse in ogni piano. La differenza e solo nel numero di postazioni.
        </p>
      </div>
    </div>
  )
}
