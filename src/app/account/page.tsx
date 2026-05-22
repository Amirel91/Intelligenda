'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CreditCard,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
  Shield,
  Sparkles,
  Info,
  CalendarDays,
  LogIn,
} from 'lucide-react'

// ==================== TYPES ====================

interface SubscriptionData {
  status: string
  planEndDate: string | null
  isExpired: boolean
  createdAt: string
  businessName: string
}

// ==================== ANTI-CHURN OPTIONS ====================

const CANCEL_REASONS = [
  { id: 'too_expensive', label: 'Costa troppo per la mia attivita', hasCustom: false },
  { id: 'not_enough', label: 'Non lo utilizzo abbastanza', hasCustom: false },
  { id: 'missing_feature', label: 'Manca una funzionalita specifica', hasCustom: true },
  { id: 'other', label: 'Altro', hasCustom: true },
] as const

// ==================== STATUS HELPERS ====================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  trial: {
    label: 'Periodo di prova',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: <Sparkles className="w-4 h-4" />,
  },
  active: {
    label: 'Attivo',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  cancelling: {
    label: 'In fase di disdetta',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  suspended: {
    label: 'Sospeso',
    color: 'text-red-700',
    bg: 'bg-red-50',
    icon: <XCircle className="w-4 h-4" />,
  },
}

// ==================== PAGE (with Suspense for useSearchParams) ====================

export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    }>
      <AccountContent />
    </Suspense>
  )
}

// ==================== CONTENT ====================

function AccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState('')

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  // Get slug from query params (set by /login redirect)
  const slug = searchParams.get('slug') || ''
  const isVercelDomain = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
  const getAgendaUrl = () => isVercelDomain
    ? `/t/${slug}/admin/login`
    : `https://${slug}.intelligenda.it/admin/login`

  // ==================== AUTH GUARD ====================

  useEffect(() => {
    if (!slug) {
      // No slug in URL — redirect to login
      router.replace('/login')
    }
  }, [slug, router])

  // ==================== FETCH SUBSCRIPTION ====================

  const fetchSubscription = useCallback(async () => {
    if (!slug) return
    try {
      setLoading(true)
      const res = await fetch(`/api/billing/status?slug=${encodeURIComponent(slug)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Errore nel caricamento')
        return
      }
      const data = await res.json()
      setSubscription(data)
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (slug) fetchSubscription()
  }, [slug, fetchSubscription])

  // ==================== HANDLE BILLING CALLBACK ====================

  useEffect(() => {
    const billingResult = searchParams.get('billing')
    if (billingResult === 'callback') {
      const result = searchParams.get('result')
      if (result === 'ok') {
        setMessage('Pagamento completato con successo! Il tuo abbonamento e stato attivato.')
        fetchSubscription()
      } else if (result === 'ko') {
        setMessage('Il pagamento non e andato a buon fine. Riprova.')
      }
      router.replace(`/account?slug=${slug}`, { scroll: false })
    }
  }, [searchParams, router, fetchSubscription, slug])

  // ==================== SUBSCRIBE ====================

  const handleSubscribe = async () => {
    setSubscribing(true)
    setError('')
    try {
      const res = await fetch(`/api/billing/subscribe?slug=${encodeURIComponent(slug)}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore nella sottoscrizione')
        return
      }

      if (data.demoMode) {
        setMessage(data.message)
        fetchSubscription()
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else if (data.subscription) {
        setMessage('Abbonamento attivato con successo!')
        fetchSubscription()
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setSubscribing(false)
    }
  }

  // ==================== CANCEL ====================

  const handleCancel = async () => {
    if (!selectedReason) {
      setCancelError('Seleziona un motivo')
      return
    }

    setCancelling(true)
    setCancelError('')

    try {
      const res = await fetch(`/api/billing/cancel?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          customReason: selectedReason === 'missing_feature' || selectedReason === 'other'
            ? customReason
            : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCancelError(data.error || 'Errore nella disdetta')
        return
      }

      setMessage(data.message)
      setShowCancelModal(false)
      setSelectedReason(null)
      setCustomReason('')
      fetchSubscription()
    } catch {
      setCancelError('Errore di connessione')
    } finally {
      setCancelling(false)
    }
  }

  // ==================== FORMATTERS ====================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTrialDays = (createdAt: string) => {
    const created = new Date(createdAt)
    const trialEnd = new Date(created)
    trialEnd.setDate(trialEnd.getDate() + 14)
    const now = new Date()
    const remaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    return { trialEnd, remaining }
  }

  // ==================== RENDER ====================

  if (!slug) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[subscription?.status || 'trial']

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ============ HEADER / NAVBAR ============ */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/landing" className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-lg font-bold text-stone-900">Il mio Account</h1>
              {subscription?.businessName && (
                <p className="text-xs text-stone-400">{subscription.businessName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            title="Esci"
          >
            <LogIn className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ============ NOTIFICATION MESSAGE ============ */}
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-800">{message}</p>
            <button onClick={() => setMessage('')} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && !subscription && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {/* ============ GESTISCI LA TUA AGENDA (HIGH CONTRAST) ============ */}
        <a
          href={getAgendaUrl()}
          className="block group"
        >
          <div className="bg-stone-900 rounded-2xl p-6 flex items-center justify-between hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Gestisci la tua Agenda</h2>
                <p className="text-sm text-stone-400 mt-0.5">
                  {isVercelDomain
                    ? `Vai al pannello operativo di ${slug}`
                    : `${slug}.intelligenda.it`}
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </a>

        {/* ============ SUBSCRIPTION CARD ============ */}
        {subscription && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900">Abbonamento e Rinnovi</h2>
                    <p className="text-xs text-stone-400">Gestisci il tuo piano IntelliGenda</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>

              {/* Plan info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-stone-50">
                  <p className="text-xs text-stone-400 mb-1">Piano</p>
                  <p className="text-sm font-semibold text-stone-900">Pro — 40 EUR/mese</p>
                </div>
                <div className="p-3 rounded-xl bg-stone-50">
                  <p className="text-xs text-stone-400 mb-1">
                    {subscription.status === 'cancelling' ? 'Scadenza servizio' : 'Prossimo rinnovo'}
                  </p>
                  <p className="text-sm font-semibold text-stone-900">
                    {subscription.planEndDate
                      ? formatDate(subscription.planEndDate)
                      : 'Non ancora attivato'}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Body: status-specific content */}
            <div className="p-6 space-y-4">
              {/* ============ TRIAL STATUS ============ */}
              {subscription.status === 'trial' && (
                <>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Stai provando IntelliGenda</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Hai {formatTrialDays(subscription.createdAt).remaining} giorni rimanenti nel tuo periodo di prova gratuito.
                          Attiva ora l&apos;abbonamento per continuare a usare tutte le funzionalita senza interruzioni.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-medium flex items-center justify-center gap-2 hover:bg-stone-800 disabled:opacity-50 transition-all"
                  >
                    {subscribing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Attiva abbonamento — 40 EUR/mese
                      </>
                    )}
                  </button>
                </>
              )}

              {/* ============ ACTIVE STATUS ============ */}
              {subscription.status === 'active' && (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm text-emerald-800">
                      Il tuo abbonamento e attivo. Il prossimo addebito di 40 EUR sara effettuato il{' '}
                      {subscription.planEndDate ? formatDate(subscription.planEndDate) : '—'}.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-3 rounded-xl border border-stone-200 text-stone-500 text-sm font-medium hover:bg-stone-50 hover:text-stone-700 transition-all"
                  >
                    Cancella abbonamento
                  </button>
                </>
              )}

              {/* ============ CANCELLING STATUS ============ */}
              {subscription.status === 'cancelling' && (
                <>
                  <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-orange-900">Disdetta in corso</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Hai richiesto la disdetta del tuo abbonamento. Il servizio rimarra completamente attivo
                          fino al {subscription.planEndDate ? formatDate(subscription.planEndDate) : '—'},
                          data in cui tutte le prenotazioni e i dati saranno sospesi.
                        </p>
                        <p className="text-xs text-orange-600 mt-2">
                          Vuoi ripensarci? Puoi riattivare l&apos;abbonamento in qualsiasi momento.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                  >
                    {subscribing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Riattiva abbonamento
                      </>
                    )}
                  </button>
                </>
              )}

              {/* ============ SUSPENDED STATUS ============ */}
              {subscription.status === 'suspended' && (
                <>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Account sospeso</p>
                        <p className="text-xs text-red-700 mt-1">
                          Il periodo di abbonamento e terminato. Il tuo account e stato sospeso
                          e il tuo negozio non e piu accessibile ai clienti.
                        </p>
                        <p className="text-xs text-red-600 mt-2">
                          Riattiva ora per tornare online e recuperare tutti i tuoi dati.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-medium flex items-center justify-center gap-2 hover:bg-stone-800 disabled:opacity-50 transition-all"
                  >
                    {subscribing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Riattiva abbonamento — 40 EUR/mese
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ============ ACCOUNT INFO CARD ============ */}
        {subscription && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h3 className="text-sm font-bold text-stone-900 mb-4">Informazioni account</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Nome attivita</span>
                <span className="text-stone-900 font-medium">{subscription.businessName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Indirizzo web</span>
                <a
                  href={isVercelDomain ? `/t/${slug}` : `https://${slug}.intelligenda.it`}
                  className="text-stone-900 font-medium hover:underline underline-offset-2"
                >
                  {slug}.intelligenda.it
                </a>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Data creazione</span>
                <span className="text-stone-900">{formatDate(subscription.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Stato</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============ CANCEL MODAL ============ */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowCancelModal(false); setSelectedReason(null); setCustomReason(''); setCancelError('') }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">Cancella abbonamento</h3>
                <button
                  onClick={() => { setShowCancelModal(false); setSelectedReason(null); setCustomReason(''); setCancelError('') }}
                  className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Warning */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                <CalendarClock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  Il tuo servizio rimarra attivo fino al{' '}
                  {subscription?.planEndDate ? formatDate(subscription.planEndDate) : 'fine del periodo pagato'}.
                  Dopo quella data, il tuo negozio sara sospeso.
                </p>
              </div>

              {/* Anti-churn feedback */}
              <div>
                <p className="text-sm text-stone-700 mb-3">
                  Ci dispiace vederti andare via. Qual e il motivo principale?
                </p>

                <div className="space-y-2">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedReason === reason.id
                          ? 'border-stone-400 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedReason === reason.id
                            ? 'border-stone-900'
                            : 'border-stone-300'
                        }`}>
                          {selectedReason === reason.id && (
                            <div className="w-2 h-2 rounded-full bg-stone-900" />
                          )}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason.id}
                        checked={selectedReason === reason.id}
                        onChange={() => { setSelectedReason(reason.id); setCancelError('') }}
                        className="sr-only"
                      />
                      <span className="text-sm text-stone-700">{reason.label}</span>
                    </label>
                  ))}
                </div>

                {/* Custom reason text field */}
                {selectedReason && CANCEL_REASONS.find(r => r.id === selectedReason)?.hasCustom && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={selectedReason === 'missing_feature'
                      ? 'Descrivi la funzionalita che ti servirebbe...'
                      : 'Scrivi il motivo...'}
                    rows={3}
                    className="mt-3 w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 resize-none transition-colors"
                  />
                )}
              </div>

              {/* Error message */}
              {cancelError && (
                <p className="text-xs text-red-600">{cancelError}</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-stone-100 flex items-center gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setSelectedReason(null); setCustomReason(''); setCancelError('') }}
                className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-all"
              >
                Torna indietro
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !selectedReason}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Conferma disdetta'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
