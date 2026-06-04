'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Loader2, User, Phone, Mail, Lock } from 'lucide-react'
import { CustomerNavbar } from '@/components/CustomerNavbar'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callback') || '/'

  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Simple step state for success animation
  const [step, setStep] = useState<'form' | 'success'>('form')

  // Redirect already-logged-in users
  useEffect(() => {
    fetch('/api/auth/customer/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) router.push(callbackUrl)
      })
      .catch(() => {})
  }, [callbackUrl, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nome.trim() || !telefono.trim() || !email.trim() || !password.trim()) return
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri')
      return
    }
    if (password !== passwordConfirm) {
      setError('Le password non coincidono')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          password,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore nella registrazione')
      }

      setStep('success')
      setTimeout(() => router.push(callbackUrl), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Link
        href={callbackUrl === '/' ? '/' : callbackUrl}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna indietro
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">Registrati</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1.5 leading-relaxed">
          Crea il tuo account per gestire le tue prenotazioni.
        </p>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm">
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Nome completo *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="text"
                  value={nome}
                  onChange={e => { setNome(e.target.value); setError('') }}
                  placeholder="Mario Rossi"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Telefono *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => { setTelefono(e.target.value); setError('') }}
                  placeholder="+39 333 1234567"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="la.tua@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Crea Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Almeno 6 caratteri"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Conferma Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => { setPasswordConfirm(e.target.value); setError('') }}
                  placeholder="Ripeti la password"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !nome.trim() || !telefono.trim() || !email.trim() || !password.trim() || !passwordConfirm.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Registrazione in corso...</>
              ) : (
                <><Check className="w-4 h-4" />Crea account</>
              )}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Account creato!</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">Reindirizzamento in corso...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      <p className="text-center text-sm text-stone-400 dark:text-stone-500 mt-6">
        Hai gia un account?{' '}
        <Link href={`/login?callback=${encodeURIComponent(callbackUrl)}`} className="text-stone-900 dark:text-stone-100 font-medium hover:underline">
          Accedi qui
        </Link>
      </p>
    </div>
  )
}

export default function CustomerRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white dark:from-stone-800 dark:to-stone-900">
      <CustomerNavbar />

      <main className="flex-1 flex items-center justify-center px-6 pt-12 pb-6">
        <Suspense fallback={
          <div className="w-full max-w-sm">
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="h-8 w-48 bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="h-4 w-72 bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="bg-white dark:bg-stone-900 rounded-2xl border dark:border-stone-700 p-6 space-y-4">
                <div className="h-12 bg-stone-100 dark:bg-stone-800 rounded-xl" />
                <div className="h-12 bg-stone-100 dark:bg-stone-800 rounded-xl" />
                <div className="h-12 bg-stone-100 dark:bg-stone-800 rounded-xl" />
              </div>
            </div>
          </div>
        }>
          <RegisterContent />
        </Suspense>
      </main>
    </div>
  )
}
