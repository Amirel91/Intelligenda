'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Store, Globe, Mail, Lock, ChevronDown,
  Loader2, Check, X, ArrowRight, LogIn,
} from 'lucide-react'
import { ACTIVITY_TYPES, ACTIVITY_GROUPS } from '@/lib/activity-types'

const initialForm = {
  fullName: '',
  businessName: '',
  slug: '',
  email: '',
  password: '',
  confirmPassword: '',
  activityType: 'ALTRO',
}

export default function BusinessRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const isVercelDomain = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
  const baseUrl = isVercelDomain ? window.location.origin : 'https://intelligenda.it'
  const getAdminUrl = (slug: string) =>
    isVercelDomain ? `${baseUrl}/t/${slug}/admin/login` : `https://${slug}.intelligenda.it/admin/login`

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
      errs.slug = 'Questo indirizzo e gia occupato'
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

      // Registration success — show success state
      setSuccessSlug(form.slug)
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

  const [successSlug, setSuccessSlug] = useState<string | null>(null)

  if (successSlug) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white">
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Account creato!</h2>
            <p className="text-stone-500 mb-6">
              Il tuo negozio e pronto su{' '}
              <span className="font-medium text-stone-700">
                {isVercelDomain ? `${baseUrl}/t/${successSlug}` : `${successSlug}.intelligenda.it`}
              </span>
            </p>
            <a
              href={getAdminUrl(successSlug)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-2xl text-lg font-medium hover:bg-stone-800 transition-colors"
            >
              Vai al pannello admin <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Registrati</h1>
            <p className="text-stone-500 text-sm mt-1.5 leading-relaxed">
              Crea il tuo negozio e inizia a ricevere prenotazioni.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {serverError}
                </div>
              )}

              {/* Nome titolare */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nome e Cognome *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={e => updateField('fullName', e.target.value)}
                    placeholder="Mario Rossi"
                    required
                    autoFocus
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors text-sm ${
                      errors.fullName ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                    }`}
                  />
                </div>
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>

              {/* Nome negozio */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Nome del Negozio *
                </label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={e => updateField('businessName', e.target.value)}
                    placeholder="Studio Rossi"
                    required
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors text-sm ${
                      errors.businessName ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                    }`}
                  />
                </div>
                {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
              </div>

              {/* Slug / indirizzo sito */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Indirizzo del sito *
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="studio-rossi"
                    required
                    className={`w-full pl-11 pr-[140px] py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors text-sm ${
                      errors.slug ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
                    .intelligenda.it
                  </div>
                </div>
                <div className="mt-1 min-h-[20px]">
                  {slugChecking && (
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifica...
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

              {/* Tipo attività */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Tipo di Attivita
                </label>
                <div className="relative">
                  <select
                    value={form.activityType}
                    onChange={e => updateField('activityType', e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors cursor-pointer text-sm"
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
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="la.tua@email.com"
                    required
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors text-sm ${
                      errors.email ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => updateField('password', e.target.value)}
                    placeholder="Minimo 6 caratteri"
                    required
                    minLength={6}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors text-sm ${
                      errors.password ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                    }`}
                  />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Conferma password */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Conferma Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => updateField('confirmPassword', e.target.value)}
                    placeholder="Ripeti la password"
                    required
                    minLength={6}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors text-sm ${
                      errors.confirmPassword ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
                    }`}
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 transition-colors"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creazione in corso...</>
                ) : (
                  <><Store className="w-4 h-4" /> Crea il tuo negozio</>
                )}
              </button>
            </form>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-stone-400 mt-6">
            Hai gia un negozio?{' '}
            <Link href="/login" className="text-stone-900 font-medium hover:underline inline-flex items-center gap-1">
              <LogIn className="w-3.5 h-3.5" /> Accedi
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
