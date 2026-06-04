'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Lock, Loader2 } from 'lucide-react'
import { CustomerNavbar } from '@/components/CustomerNavbar'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callback') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect already-logged-in users
  useEffect(() => {
    fetch('/api/auth/customer/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) router.push(callbackUrl)
      })
      .catch(() => {})
  }, [callbackUrl, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Credenziali non valide')
      }
      router.push(callbackUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Back link */}
      <Link
        href={callbackUrl === '/' ? '/' : callbackUrl}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna indietro
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">Accedi</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1.5 leading-relaxed">
          Inserisci le tue credenziali per accedere al tuo account.
        </p>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="la.tua@email.com"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="La tua password"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-stone-400 dark:text-stone-500 mt-6">
        Non hai ancora un account?{' '}
        <Link href="/register" className="text-stone-900 dark:text-stone-100 font-medium hover:underline">
          Registrati qui
        </Link>
      </p>
    </div>
  )
}

export default function CustomerLoginPage() {
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
                <div className="h-12 bg-stone-900/10 dark:bg-white/10 rounded-xl" />
              </div>
            </div>
          </div>
        }>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  )
}
