'use client'

import { useState, useEffect, useRef } from 'react'
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
  Zap,
  Crown,
  Building2,
  Settings,
  Phone as PhoneIcon,
} from 'lucide-react'
import Image from 'next/image'
import { ACTIVITY_TYPES, ACTIVITY_GROUPS } from '@/lib/activity-types'

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

// ==================== PRICING DATA (matches admin plans.ts) ====================

const PRICING_PLANS = [
  {
    id: 'trial',
    name: 'Prova Gratuita',
    price: 0,
    period: '30 giorni',
    maxPostazioni: 2,
    description: 'Inizia subito senza carta di credito. Tutte le funzionalità incluse per 30 giorni.',
    features: [
      '30 giorni di prova gratuita',
      'Tutte le funzionalità incluse',
      'Fino a 2 postazioni',
      'Sottodominio dedicato',
      'Assistenza locale inclusa',
    ],
    highlighted: false,
    gradient: 'from-stone-50 to-stone-100',
    borderColor: 'border-stone-200',
    icon: Zap,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    period: '/mese',
    maxPostazioni: 2,
    description: 'Ideale per liberi professionisti e piccoli studi con 1-2 postazioni.',
    features: [
      'Fino a 2 postazioni',
      'Sottodominio dedicato',
      'Assistenza locale inclusa',
      'Zero commissioni',
      'Disdici quando vuoi',
    ],
    highlighted: false,
    gradient: 'from-stone-100 to-stone-200',
    borderColor: 'border-stone-300',
    icon: Sparkles,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    period: '/mese',
    maxPostazioni: 4,
    description: 'Per studi medi con più collaboratori e un volume crescente di prenotazioni.',
    features: [
      'Fino a 4 postazioni',
      'Sottodominio dedicato',
      'Assistenza locale inclusa',
      'Zero commissioni',
      'Disdici quando vuoi',
    ],
    highlighted: true,
    gradient: 'from-stone-900 to-stone-700',
    borderColor: 'border-stone-800',
    icon: Crown,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 59,
    period: '/mese',
    maxPostazioni: 8,
    description: 'Per grandi attività e centri con numerose postazioni e collaboratori.',
    features: [
      'Fino a 8 postazioni',
      'Sottodominio dedicato',
      'Assistenza prioritaria',
      'Zero commissioni',
      'Disdici quando vuoi',
    ],
    highlighted: false,
    gradient: 'from-stone-100 to-stone-50',
    borderColor: 'border-stone-300',
    icon: Building2,
  },
  {
    id: 'custom',
    name: 'Custom',
    price: -1,
    description: 'Hai esigenze particolari? Più postazioni, integrazioni personalizzate o un pacchetto su misura per la tua attività.',
    features: [
      'Piano completamente su misura',
      'Postazioni illimitate',
      'Integrazioni personalizzate',
      'Assistenza dedicata',
      'Prezzo definito insieme',
    ],
    highlighted: false,
    gradient: '',
    borderColor: '',
    icon: Settings,
    isCustom: true,
  },
]

// ==================== NAV LINKS ====================

const NAV_LINKS = [
  { label: 'Panoramica', href: '#panoramica' },
  { label: 'Come Funziona', href: '#come-funziona' },
  { label: 'Prezzi', href: '#prezzi' },
  { label: 'Registrati', href: '#registrati' },
]

// ==================== LANDING PAGE ====================

export default function LandingPage() {
  // Detect if running on vercel.app
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

  // Contact form state
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactSubmitting, setContactSubmitting] = useState(false)
  const [contactSuccess, setContactSuccess] = useState(false)
  const [contactError, setContactError] = useState('')

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

  // Get selected activity display info
  const selectedActivity = ACTIVITY_TYPES.find(a => a.id === form.activityType)

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
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Account creato!</h2>
            <p className="text-stone-500 mb-6">
              Il tuo sito è pronto su{' '}
              <a
                href={getTenantUrl(form.slug)}
                className="text-stone-900 font-medium underline underline-offset-4"
              >
                {isVercelDomain ? `${baseUrl}/t/${form.slug}` : `${form.slug}.intelligenda.it`}
              </a>
            </p>
            <a
              href={getAdminUrl(form.slug)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-2xl text-lg font-medium hover:bg-stone-800 transition-colors"
            >
              Vai al pannello admin <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ==================== NAVBAR ==================== */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-stone-100/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo + Brand */}
          <a href="/landing" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
            <Image src="/logo.png" alt="IntelliGenda" width={40} height={40} className="shrink-0 object-contain" priority />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Jost', sans-serif" }}>
              <span className="text-stone-900">Intelli</span>
              <span className="text-stone-400">Genda</span>
            </span>
          </a>

          {/* Desktop centered nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-50 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop right — Accedi */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all"
            >
              <LogIn className="w-4 h-4" />
              Accedi
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-100 bg-white px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="border-t border-stone-100 pt-2 mt-2">
              <a
                href="/accedi"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-stone-900 bg-stone-50 rounded-xl"
              >
                <LogIn className="w-4 h-4" />
                Accedi
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 flex flex-col items-center text-center px-6">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-stone-900 leading-[1.08] max-w-4xl" style={{ fontFamily: "'Jost', sans-serif" }}>
          Il tuo tempo,
          <br />
          <span className="text-stone-400">senza interruzioni.</span>
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto mt-5 font-normal leading-relaxed">
          IntelliGenda automatizza le prenotazioni della tua attivit&agrave;. L&apos;algoritmo smart incastra gli appuntamenti al millimetro. Tu ti concentri solo sul tuo lavoro.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#registrati"
            className="inline-flex items-center justify-center px-8 py-4 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 hover:scale-105 active:scale-100 transition-all shadow-xl shadow-stone-900/20"
          >
            Inizia la prova gratuita di 30 giorni
          </a>
        </div>
        <a
          href="#come-funziona"
          className="mt-8 inline-flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm transition-colors"
        >
          Scopri come funziona&nbsp;&darr;
        </a>
      </section>

      {/* ==================== PANORAMICA (3 passi) ==================== */}
      <section id="panoramica" className="py-16 md:py-20 px-6 scroll-mt-16">
        <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-10 text-center" style={{ fontFamily: "'Jost', sans-serif" }}>
          Tre passi. Automazione totale.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[
            {
              step: '01',
              title: 'Configura.',
              desc: 'Scegli la tua professione. IntelliGenda ti suggerisce subito i tuoi servizi di punta con durate predefinite. Attiva le tue postazioni, imposta i tuoi orari e la tua agenda è pronta in 30 secondi.',
            },
            {
              step: '02',
              title: 'Condividi.',
              desc: 'Scarica il tuo QR Code unico per la vetrina del negozio o inserisci il tuo link dedicato sui profili Instagram, Facebook e Google Maps. I tuoi clienti sapranno sempre dove trovarti, anche quando sei chiuso.',
            },
            {
              step: '03',
              title: 'Ricevi.',
              desc: "Il cliente prenota dallo smartphone in 3 click, senza registrazioni o password. L'algoritmo smart calcola i tempi dei trattamenti, assegna la poltrona libera e aggiunge in automatico le tue pause di pulizia.",
            },
          ].map(item => (
            <div
              key={item.step}
              className="group relative bg-gradient-to-br from-stone-50 to-stone-100/80 border border-stone-200/60 rounded-2xl p-7 md:p-9
                transition-all duration-300 ease-out
                hover:shadow-2xl hover:shadow-stone-900/10 hover:-translate-y-2 hover:border-stone-300/80"
            >
              <span className="text-stone-400 font-mono text-sm mb-2 block">{item.step}</span>
              <h3 className="text-lg font-semibold text-stone-900 mb-3">{item.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
              {/* Subtle shine effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 via-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          ))}
        </div>
      </section>

      {/* ==================== COME FUNZIONA (Bento Grid) ==================== */}
      <section id="come-funziona" className="py-16 md:py-20 px-6 scroll-mt-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight" style={{ fontFamily: "'Jost', sans-serif" }}>
            Nessun pensiero.
            <br />
            <span className="text-stone-400">Pensa solo al tuo lavoro.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {/* Card 1 */}
          <div
            className="group relative bg-gradient-to-br from-stone-50 via-stone-100 to-stone-50 border border-stone-200/60 rounded-2xl p-7 md:p-9
              transition-all duration-300 ease-out
              hover:shadow-2xl hover:shadow-stone-900/10 hover:-translate-y-2 hover:border-stone-300/80"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center mb-5 shadow-sm">
              <Brain className="w-5 h-5 text-stone-900" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-3">
              Ottimizzazione matematica.
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              L&apos;algoritmo predittivo calcola la durata totale dei trattamenti e trova l&apos;incastro perfetto sul calendario delle tue postazioni.
              Ogni slot è ottimizzato al millimetro, azzerando i tempi morti e i buchi nell&apos;agenda.
            </p>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 via-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
          {/* Card 2 */}
          <div
            className="group relative bg-gradient-to-br from-stone-100 via-stone-50 to-stone-100 border border-stone-200/60 rounded-2xl p-7 md:p-9
              transition-all duration-300 ease-out
              hover:shadow-2xl hover:shadow-stone-900/10 hover:-translate-y-2 hover:border-stone-300/80"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center mb-5 shadow-sm">
              <Smartphone className="w-5 h-5 text-stone-900" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-3">
              Nessun ostacolo.
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Nessuna applicazione da scaricare, nessuna password da ricordare o recuperare per i tuoi clienti.
              Prenotano in meno di un minuto direttamente dallo smartphone, riducendo al minimo la resistenza all&apos;acquisto.
            </p>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 via-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
          {/* Card 3 */}
          <div
            className="group relative bg-gradient-to-br from-stone-50 via-stone-100 to-stone-50 border border-stone-200/60 rounded-2xl p-7 md:p-9
              transition-all duration-300 ease-out
              hover:shadow-2xl hover:shadow-stone-900/10 hover:-translate-y-2 hover:border-stone-300/80"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center mb-5 shadow-sm">
              <LayoutDashboard className="w-5 h-5 text-stone-900" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-3">
              Controllo centralizzato.
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Gestisci più poltrone, collaboratori, orari speciali e periodi di ferie da un unico pannello installabile sul tuo telefono.
              In più, IntelliGenda crea in automatico l&apos;archivio storico dei tuoi clienti con il loro fatturato e le ultime visite.
            </p>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 via-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ==================== PREZZI (4 piani) ==================== */}
      <section id="prezzi" className="py-16 md:py-20 px-6 scroll-mt-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight" style={{ fontFamily: "'Jost', sans-serif" }}>
            Un unico piano. Nessuna sorpresa.
          </h2>
          <p className="text-stone-500 mt-3 text-sm max-w-lg mx-auto">
            Scegli il piano più adatto alla tua attività. Tutti includono l&apos;accesso completo a tutte le funzionalità.
            30 giorni di prova gratuita per ogni piano.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
          {PRICING_PLANS.map(plan => {
            const IconComp = plan.icon
            const isDark = plan.highlighted
            const isCustom = 'isCustom' in plan && plan.isCustom

            if (isCustom) {
              return (
                <div
                  key={plan.id}
                  className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-stone-300 hover:border-stone-400 p-6 bg-white
                    transition-all duration-300 ease-out
                    hover:shadow-2xl hover:shadow-stone-900/8 hover:-translate-y-3 hover:scale-[1.02]
                    flex flex-col"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-stone-50/50 to-white/0 group-hover:to-stone-100/30 transition-all duration-500 pointer-events-none" />

                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
                    <IconComp className="w-5 h-5 text-stone-500" />
                  </div>

                  <h3 className="text-lg font-bold mb-1 text-stone-900" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {plan.name}
                  </h3>

                  <p className="text-xs leading-relaxed mb-4 text-stone-500">
                    {plan.description}
                  </p>

                  <div className="mb-5">
                    <span className="text-2xl font-extrabold text-stone-400">Su misura</span>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map(feat => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
                        <span className="text-stone-500">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#contattaci"
                    className="block text-center py-3 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg transition-all duration-200"
                  >
                    Contattaci
                  </a>
                </div>
              )
            }

            return (
              <div
                key={plan.id}
                className={`group relative overflow-hidden rounded-2xl border ${plan.borderColor} p-6
                  transition-all duration-300 ease-out
                  hover:shadow-2xl hover:shadow-stone-900/12 hover:-translate-y-3 hover:scale-[1.02]
                  ${isDark
                    ? 'bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 text-white ring-2 ring-stone-700/50'
                    : `bg-gradient-to-br ${plan.gradient}`
                  }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent
                  group-hover:to-white/10 transition-all duration-500 pointer-events-none ${isDark ? '' : 'group-hover:to-white/60'}`} />

                {plan.highlighted && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/15 rounded-full text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                    Popolare
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/10' : 'bg-white border border-stone-200 shadow-sm'}`}>
                  <IconComp className={`w-5 h-5 ${isDark ? 'text-white' : 'text-stone-900'}`} />
                </div>

                <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-stone-900'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                  {plan.name}
                </h3>

                <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-stone-300' : 'text-stone-500'}`}>
                  {plan.description}
                </p>

                <div className="mb-5">
                  <span className={`text-4xl font-extrabold ${isDark ? 'text-white' : 'text-stone-900'}`}>
                    {plan.price === 0 ? 'Gratis' : `${plan.price}€`}
                  </span>
                  {plan.price > 0 && (
                    <span className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-400'}`}> {plan.period}</span>
                  )}
                  {plan.price === 0 && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-stone-400' : 'text-stone-400'}`}>{plan.period}</p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-stone-600'}`} />
                      <span className={isDark ? 'text-stone-200' : 'text-stone-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#registrati"
                  className={`block text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isDark
                      ? 'bg-white text-stone-900 hover:bg-stone-100 hover:shadow-lg'
                      : 'bg-stone-900 text-white hover:bg-stone-800 hover:shadow-lg'
                    }`}
                >
                  {plan.price === 0 ? 'Inizia Gratis' : 'Scegli questo piano'}
                </a>
              </div>
            )
          })}
        </div>
      </section>

      {/* ==================== REGISTRAZIONE ==================== */}
      <section id="registrati" className="py-16 md:py-20 px-6 scroll-mt-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Image src="/logo.png" alt="IntelliGenda" width={48} height={48} className="mx-auto mb-4 object-contain" />
            <h2 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Crea il tuo account</h2>
            <p className="text-stone-500 text-sm">
              Inizia a ricevere prenotazioni in meno di 2 minuti.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 bg-gradient-to-br from-stone-50 to-stone-100/80 rounded-3xl p-6 sm:p-8 border border-stone-200/60
            transition-all duration-300 hover:shadow-xl hover:shadow-stone-900/5">
            {serverError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center flex items-center justify-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                {serverError}
              </div>
            )}

            {/* Nome e Cognome */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Nome e Cognome del titolare
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => updateField('fullName', e.target.value)}
                  placeholder="Mario Rossi"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
                    errors.fullName ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                  }`}
                />
              </div>
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Nome Attività */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Nome dell&apos;Attività
              </label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => updateField('businessName', e.target.value)}
                  placeholder="Studio Rossi"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
                    errors.businessName
                      ? 'border-red-400'
                      : 'border-stone-200 focus:border-stone-900'
                  }`}
                />
              </div>
              {errors.businessName && (
                <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>
              )}
            </div>

            {/* Indirizzo sito */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Indirizzo del sito desiderato
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
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
                  className={`w-full pl-11 pr-40 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
                    errors.slug ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 pointer-events-none">
                  .intelligenda.it
                </div>
              </div>
              <div className="mt-1 min-h-[20px]">
                {slugChecking && (
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verifica disponibilità...
                  </span>
                )}
                {!slugChecking && slugAvailable === true && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Disponibile
                  </span>
                )}
                {!slugChecking && slugAvailable === false && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> Non disponibile
                  </span>
                )}
              </div>
              {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
            </div>

            {/* Tipo di Attività */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Tipo di Attività
              </label>
              <div className="relative">
                <select
                  value={form.activityType}
                  onChange={e => updateField('activityType', e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors cursor-pointer"
                >
                  {ACTIVITY_GROUPS.map(group => (
                    <optgroup key={group.id} label={group.name}>
                      {ACTIVITY_TYPES.filter(a => a.group === group.id || (group.id === 'ALTRO' && a.id === 'ALTRO')).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="mario@email.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
                    errors.email ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                  }`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
                    errors.password ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Conferma Password */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Conferma Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  placeholder="Ripeti la password"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
                    errors.confirmPassword ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-stone-900 text-white text-lg font-medium flex items-center justify-center gap-2 hover:bg-stone-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all"
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
        className="py-16 px-6 bg-stone-900 text-white"
      >
        <div className="max-w-lg mx-auto text-center">
          <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "'Jost', sans-serif" }}>
            IntelliGenda arriva nella tua zona.
          </h2>
          <p className="text-stone-400 text-sm sm:text-base leading-relaxed mb-8">
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
                  setLeadError('Inserisci un\'email valida')
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
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => { setLeadEmail(e.target.value); setLeadError('') }}
                  placeholder="La tua email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-stone-500 outline-none focus:border-white/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={leadSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-stone-900 rounded-xl font-medium hover:bg-stone-100 disabled:opacity-50 transition-colors whitespace-nowrap"
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

          <p className="mt-6 text-xs text-stone-500">
            Niente spam. Solo una comunicazione quando saremo pronti per la tua zona.
          </p>
        </div>
      </section>

      {/* ==================== CONTATTACI ==================== */}
      <section id="contattaci" className="py-16 md:py-20 px-6 scroll-mt-16">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-stone-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: "'Jost', sans-serif" }}>Contattaci</h2>
            <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
              Hai bisogno di informazioni, hai una richiesta particolare o vuoi un piano personalizzato?
              Scrivici e ti risponderemo il prima possibile.
            </p>
          </div>

          {contactSuccess ? (
            <div className="text-center py-10 bg-emerald-50 rounded-3xl border border-emerald-200">
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-emerald-700 font-semibold text-lg mb-1">Messaggio inviato!</p>
              <p className="text-emerald-600 text-sm">Ti risponderemo al pi&ugrave; presto.</p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setContactError('')
                if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
                  setContactError('Inserisci un\'email valida')
                  return
                }
                if (!contactMessage.trim() || contactMessage.trim().length < 10) {
                  setContactError('Il messaggio deve contenere almeno 10 caratteri')
                  return
                }
                setContactSubmitting(true)
                try {
                  const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: contactEmail.trim(),
                      phone: contactPhone.trim() || undefined,
                      message: contactMessage.trim(),
                    }),
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    setContactError(data.error || 'Errore. Riprova.')
                    return
                  }
                  setContactSuccess(true)
                } catch {
                  setContactError('Errore di connessione. Riprova.')
                } finally {
                  setContactSubmitting(false)
                }
              }}
              className="space-y-4 bg-gradient-to-br from-stone-50 to-stone-100/80 rounded-3xl p-6 sm:p-8 border border-stone-200/60"
            >
              {contactError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center flex items-center justify-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {contactError}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => { setContactEmail(e.target.value); setContactError('') }}
                    placeholder="la-tua@email.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors border-stone-200 focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Telefono */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Telefono <span className="text-stone-400 font-normal">(opzionale)</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+39 333 1234567"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors border-stone-200 focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Messaggio */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Messaggio *</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => { setContactMessage(e.target.value); setContactError('') }}
                  placeholder="Descrivi la tua richiesta o la tua esigenza..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors border-stone-200 focus:border-stone-900 resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={contactSubmitting}
                className="w-full py-4 rounded-2xl bg-stone-900 text-white text-lg font-medium flex items-center justify-center gap-2 hover:bg-stone-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all"
              >
                {contactSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Invia messaggio
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-8 text-center border-t border-stone-100">
        <p className="text-xs text-stone-400">&copy; 2026 IntelliGenda &egrave; un prodotto di <a href="https://www.mecalab.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-stone-600 transition-colors">MecaLab</a> &mdash; Tutti i diritti riservati.</p>
        <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
          <a
            href="/termini"
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline-offset-2 hover:underline"
          >
            Termini e Condizioni
          </a>
          <span className="text-stone-300">|</span>
          <a
            href="/privacy"
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          <span className="text-stone-300">|</span>
          <a
            href="mailto:info@intelligenda.it"
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline-offset-2 hover:underline"
          >
            Contatti: info@intelligenda.it
          </a>
        </div>
      </footer>

      {/* Google Font: Jost */}
      <link
        href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
    </div>
  )
}
