'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowRight,
  Brain,
  Smartphone,
  LayoutDashboard,
  Check,
  User,
  Store,
  Globe,
  Mail,
  Lock,
  Loader2,
  X,
  Sparkles,
  MapPin,
  Send,
  CheckCircle2,
  LogIn,
  Menu,
  ChevronDown,
  ChevronRight,
  Users,
  MessageCircle,
} from 'lucide-react'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'
import { ACTIVITY_TYPES, ACTIVITY_GROUPS } from '@/lib/activity-types'
import { ThemeToggle } from '@/components/ThemeToggle'

// ==================== FORM STATE ====================

const initialForm = {
  fullName: '',
  businessName: '',
  slug: '',
  email: '',
  password: '',
  confirmPassword: '',
  activityType: 'ALTRO',
}

// ==================== LANDING PAGE ====================

export default function LandingPage() {
  // Detect if running on vercel.app (no custom domain / subdomain support)
  const isVercelDomain = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
  const baseUrl = isVercelDomain ? window.location.origin : 'https://intelligenda.it'
  const getTenantUrl = (slug: string) => isVercelDomain ? `${baseUrl}/t/${slug}` : `https://${slug}.intelligenda.it`
  const getAdminUrl = (slug: string) => isVercelDomain ? `${baseUrl}/t/${slug}/admin/login` : `https://${slug}.intelligenda.it/admin/login`

  // Ref for smooth scroll to lead section
  const scontoRef = useRef<HTMLElement>(null)

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Registration form state
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  // Activity dropdown state
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const activityDropdownRef = useRef<HTMLDivElement>(null)

  // Lead form state
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadSuccess, setLeadSuccess] = useState(false)
  const [leadError, setLeadError] = useState('')

  // Slug availability check (debounced)
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)

    const slug = form.slug
    if (!slug || slug.length < 3) {
      setSlugAvailable(null)
      setSlugChecking(false)
      return
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setSlugAvailable(false)
      setSlugChecking(false)
      return
    }

    setSlugChecking(true)
    slugTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register?slug=${encodeURIComponent(slug)}`)
        const data = await res.json()
        setSlugAvailable(data.available)
      } catch {
        setSlugAvailable(null)
      } finally {
        setSlugChecking(false)
      }
    }, 400)

    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    }
  }, [form.slug])

  // Click outside handler for activity dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(e.target as Node)) {
        setActivityDropdownOpen(false)
        setExpandedGroup(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Get selected activity display info
  const selectedActivity = ACTIVITY_TYPES.find(a => a.id === form.activityType)
  const selectedGroupEmoji = selectedActivity
    ? ACTIVITY_GROUPS.find(g => g.id === selectedActivity.group)?.name.split(' ')[0] || ''
    : ''

  // ==================== FORM HANDLING ====================

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!form.fullName.trim()) errs.fullName = 'Obbligatorio'
    if (!form.businessName.trim()) errs.businessName = 'Obbligatorio'
    if (!form.slug.trim()) {
      errs.slug = 'Obbligatorio'
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      errs.slug = 'Solo lettere minuscole, numeri e trattini'
    } else if (form.slug.length < 3) {
      errs.slug = 'Minimo 3 caratteri'
    } else if (slugAvailable === false) {
      errs.slug = 'Questo indirizzo è già occupato'
    }
    if (!form.email.trim()) {
      errs.email = 'Obbligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email non valida'
    }
    if (!form.password) {
      errs.password = 'Obbligatorio'
    } else if (form.password.length < 6) {
      errs.password = 'Minimo 6 caratteri'
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Obbligatorio'
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Le password non coincidono'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error || 'Errore nella registrazione')
        return
      }

      setSuccess(true)
    } catch {
      setServerError('Errore di connessione. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    setServerError('')
  }

  // ==================== RENDER ====================

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Account creato!</h2>
            <p className="text-stone-500 dark:text-stone-400 mb-6">
              Il tuo sito è pronto su{' '}
              <a
                href={getTenantUrl(form.slug)}
                className="text-stone-900 dark:text-stone-100 font-medium underline underline-offset-4"
              >
                {isVercelDomain ? `${baseUrl}/t/${form.slug}` : `${form.slug}.intelligenda.it`}
              </a>
            </p>
            <a
              href={getAdminUrl(form.slug)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl text-lg font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
            >
              Vai al pannello admin <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-900 flex flex-col">
      {/* ==================== NAVBAR ==================== */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-100 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <a href="/landing" className="text-stone-900 dark:text-stone-100 hover:opacity-80 transition-opacity">
            <IntelliGendaLogo size="xl" textClassName="!text-sm" />
          </a>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-6">
            <a href="#registrati" className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Registrati
            </a>
            <ThemeToggle />
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Accedi
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 space-y-2">
            <a
              href="#registrati"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Registrati
            </a>
            <a
              href="/accedi"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Accedi
            </a>
          </div>
        )}
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="pt-32 pb-24 md:pt-48 md:pb-36 flex flex-col items-center text-center px-6">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-none max-w-4xl">
          Il tuo tempo,
          <br />
          <span className="text-stone-400 dark:text-stone-500">senza interruzioni.</span>
        </h1>
        <p className="text-xl text-stone-500 dark:text-stone-400 max-w-2xl mx-auto mt-6 font-normal leading-relaxed">
          IntelliGenda automatizza le prenotazioni della tua attivit&agrave;. L&apos;algoritmo smart incastra gli appuntamenti al millimetro. Tu ti concentri solo sul tuo lavoro.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#registrati"
            className="inline-flex items-center justify-center px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-lg shadow-stone-900/15 dark:shadow-black/15"
          >
            Inizia la prova gratuita di 30 giorni
          </a>
        </div>
        <a
          href="#come-funziona"
          className="mt-10 inline-flex items-center gap-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 text-sm transition-colors"
        >
          Scopri come funziona&nbsp;&darr;
        </a>
      </section>

      {/* ==================== COME FUNZIONA ==================== */}
      <section id="come-funziona" className="py-24 md:py-32 px-6 scroll-mt-14">
        <h2 className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight mb-12 text-center">
          Tre passi. Automazione totale.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Step 01 */}
          <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-3xl p-8 md:p-10">
            <span className="text-stone-400 dark:text-stone-500 font-mono text-sm mb-2 block">01</span>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">Configura.</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
              Scegli la tua professione. IntelliGenda ti suggerisce subito i tuoi servizi di punta con durate predefinite.
              Attiva le tue postazioni, imposta i tuoi orari e la tua agenda è pronta in 30 secondi.
            </p>
          </div>
          {/* Step 02 */}
          <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-3xl p-8 md:p-10">
            <span className="text-stone-400 dark:text-stone-500 font-mono text-sm mb-2 block">02</span>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">Condividi.</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
              Scarica il tuo QR Code unico per la vetrina del negozio o inserisci il tuo link dedicato sui profili
              Instagram, Facebook e Google Maps. I tuoi clienti sapranno sempre dove trovarti, anche quando sei chiuso.
            </p>
          </div>
          {/* Step 03 */}
          <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-3xl p-8 md:p-10">
            <span className="text-stone-400 dark:text-stone-500 font-mono text-sm mb-2 block">03</span>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">Ricevi.</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
              Il cliente prenota dallo smartphone in 3 click, senza registrazioni o password. L&apos;algoritmo smart calcola
              i tempi dei trattamenti, assegna la poltrona libera e aggiunge in automatico le tue pause di pulizia.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== BENTO GRID — VALORI ==================== */}
      <section className="py-24 md:py-32 px-6">
        <div className="text-center mt-24 mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight text-center">
            Nessun pensiero.
            <br />
            <span className="text-stone-400 dark:text-stone-500">Pensa solo al tuo lavoro.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card 1 — Ottimizzazione matematica */}
          <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-3xl p-8 md:p-10">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center mb-6">
              <Brain className="w-5 h-5 text-stone-900 dark:text-stone-100" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">
              Ottimizzazione matematica.
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
              L&apos;algoritmo predittivo calcola la durata totale dei trattamenti e trova l&apos;incastro perfetto sul calendario delle tue postazioni.
              Ogni slot è ottimizzato al millimetro, azzerando i tempi morti e i buchi nell&apos;agenda.
            </p>
          </div>
          {/* Card 2 — Nessun ostacolo */}
          <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-3xl p-8 md:p-10">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center mb-6">
              <Smartphone className="w-5 h-5 text-stone-900 dark:text-stone-100" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">
              Nessun ostacolo.
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
              Nessuna applicazione da scaricare, nessuna password da ricordare o recuperare per i tuoi clienti.
              Prenotano in meno di un minuto direttamente dallo smartphone, riducendo al minimo la resistenza all&apos;acquisto.
            </p>
          </div>
          {/* Card 3 — Controllo centralizzato */}
          <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-3xl p-8 md:p-10">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center mb-6">
              <LayoutDashboard className="w-5 h-5 text-stone-900 dark:text-stone-100" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">
              Controllo centralizzato.
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
              Gestisci più poltrone, collaboratori, orari speciali e periodi di ferie da un unico pannello installabile sul tuo telefono.
              In più, IntelliGenda crea in automatico l&apos;archivio storico dei tuoi clienti con il loro fatturato e le ultime visite.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== PREZZO ==================== */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-4">
            Un unico piano. Nessuna sorpresa.
          </p>
          <div className="mb-10">
            <span className="text-7xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">40€</span>
            <span className="text-xl text-stone-400 dark:text-stone-500 font-normal"> / mese</span>
          </div>
          <ul className="space-y-4 text-left text-stone-600 dark:text-stone-400 max-w-xs mx-auto">
            <li className="flex items-start gap-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500 mt-2 shrink-0" />
              Sottodominio dedicato
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500 mt-2 shrink-0" />
              Assistenza locale inclusa
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500 mt-2 shrink-0" />
              Zero commissioni sulle prenotazioni
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500 mt-2 shrink-0" />
              Disdici quando vuoi
            </li>
          </ul>
          <a
            href="#registrati"
            className="mt-10 inline-flex items-center justify-center px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-lg shadow-stone-900/15 dark:shadow-black/15"
          >
            Inizia la prova gratuita
          </a>
        </div>
      </section>

      {/* ==================== REGISTRAZIONE ==================== */}
      <section id="registrati" className="py-20 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Sparkles className="w-10 h-10 text-stone-900 dark:text-stone-100 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Crea il tuo account</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              Inizia a ricevere prenotazioni in meno di 2 minuti.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 bg-stone-50 dark:bg-stone-800/50 rounded-3xl p-6 sm:p-8 border border-stone-100 dark:border-stone-800">
            {serverError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm text-center flex items-center justify-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                {serverError}
              </div>
            )}

            {/* Nome e Cognome */}
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                Nome e Cognome del titolare
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => updateField('fullName', e.target.value)}
                  placeholder="Mario Rossi"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                    errors.fullName ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                  }`}
                />
              </div>
              {errors.fullName && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Nome Attività */}
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                Nome dell&apos;Attività
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => updateField('businessName', e.target.value)}
                  placeholder="Studio Rossi"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                    errors.businessName
                      ? 'border-red-400'
                      : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                  }`}
                />
              </div>
              {errors.businessName && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.businessName}</p>
              )}
            </div>

            {/* Indirizzo sito */}
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                Indirizzo del sito desiderato
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  value={form.slug}
                  onChange={e =>
                    updateField(
                      'slug',
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    )
                  }
                  placeholder="studio-rossi"
                  className={`w-full pl-11 pr-40 py-3 rounded-xl border-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                    errors.slug ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 dark:text-stone-500 pointer-events-none">
                  .intelligenda.it
                </div>
              </div>
              <div className="mt-1 min-h-[20px]">
                {slugChecking && (
                  <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verifica disponibilità...
                  </span>
                )}
                {!slugChecking && slugAvailable === true && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Disponibile
                  </span>
                )}
                {!slugChecking && slugAvailable === false && (
                  <span className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                    <X className="w-3 h-3" /> Non disponibile
                  </span>
                )}
              </div>
              {errors.slug && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.slug}</p>}
            </div>

            {/* Tipo di Attività — Custom Grouped Dropdown */}
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                Tipo di Attività
              </label>
              <div className="relative">
                <select
                  value={form.activityType}
                  onChange={e => updateField('activityType', e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors cursor-pointer"
                >
                  {ACTIVITY_GROUPS.map(group => (
                    <optgroup key={group.id} label={group.name}>
                      {ACTIVITY_TYPES.filter(a => a.group === group.id || (group.id === 'ALTRO' && a.id === 'ALTRO')).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="mario@email.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                    errors.email ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                  }`}
                />
              </div>
              {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="password"
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                    errors.password ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Conferma Password */}
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Conferma Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  placeholder="Ripeti la password"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                    errors.confirmPassword ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-lg font-medium flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Creazione in corso...
                </>
              ) : (
                <>
                  Crea il tuo account <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* ==================== SCONTO LANCIO (Lead Collection) ==================== */}
      <section
        id="sconto-lancio"
        ref={scontoRef}
        className="py-20 px-6 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 scroll-mt-0"
      >
        <div className="max-w-lg mx-auto text-center">
          <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-white/10 dark:bg-stone-200/20 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white dark:text-stone-900" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            IntelliGenda arriva nella tua zona.
          </h2>
          <p className="text-stone-400 dark:text-stone-500 text-sm sm:text-base leading-relaxed mb-8">
            Stiamo selezionando le prime 15 attività sul territorio a cui offrire una prova gratuita e
            l&apos;assistenza all&apos;installazione a costo zero. Lascia la tua email per bloccare il tuo
            posto prioritario e ricevere il coupon per il primo mese scontato.
          </p>

          {leadSuccess ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <p className="text-emerald-400 text-lg font-medium">
                Posto bloccato! Ti contatteremo a breve.
              </p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setLeadError('')
                if (!leadEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim())) {
                  setLeadError('Inserisci un&apos;email valida')
                  return
                }
                setLeadSubmitting(true)
                try {
                  const res = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: leadEmail.trim() }),
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    setLeadError(data.error || 'Errore. Riprova.')
                    return
                  }
                  setLeadSuccess(true)
                } catch {
                  setLeadError('Errore di connessione. Riprova.')
                } finally {
                  setLeadSubmitting(false)
                }
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <div className="flex-1 relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 dark:text-stone-400" />
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => { setLeadEmail(e.target.value); setLeadError('') }}
                  placeholder="La tua email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/10 dark:bg-stone-200/20 border border-white/20 text-white dark:text-stone-900 placeholder-stone-500 dark:placeholder-stone-600 outline-none focus:border-white/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={leadSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-xl font-medium hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {leadSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Blocca il mio sconto prioritario
              </button>
            </form>
          )}

          {leadError && !leadSuccess && (
            <p className="mt-3 text-sm text-red-400">{leadError}</p>
          )}

          <p className="mt-6 text-xs text-stone-600 dark:text-stone-400">
            Niente spam. Solo una comunicazione quando saremo pronti per la tua zona.
          </p>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-8 text-center border-t border-stone-100 dark:border-stone-800">
        <p className="text-xs text-stone-400 dark:text-stone-500">&copy; 2026 IntelliGenda &egrave; un prodotto di <a href="https://www.mecalab.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-stone-600 dark:hover:text-stone-400 transition-colors">MecaLab</a> &mdash; Tutti i diritti riservati.</p>
        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
          <a
            href="/termini"
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors underline-offset-2 hover:underline"
          >
            Termini e Condizioni
          </a>
          <span className="text-stone-300 dark:text-stone-600">|</span>
          <a
            href="/privacy"
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          <span className="text-stone-300 dark:text-stone-600">|</span>
          <a
            href="mailto:info@intelligenda.it"
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors underline-offset-2 hover:underline"
          >
            Contatti: info@intelligenda.it
          </a>
        </div>
      </footer>
    </div>
  )
}
