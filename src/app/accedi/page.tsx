'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Loader2, Globe, ArrowRight, LogIn } from 'lucide-react'

export default function BusinessLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ slug: string; businessName: string; adminUrl: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/auth/resolve-tenant?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()

      if (!res.ok || !data.found) {
        setError('Nessun account trovato con questa email. Registrati per creare il tuo negozio.')
        return
      }

      setResult({ slug: data.slug, businessName: data.businessName, adminUrl: data.adminUrl })
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
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
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Accedi al pannello</h1>
            <p className="text-stone-500 text-sm mt-1.5 leading-relaxed">
              Inserisci l&apos;email usata durante la registrazione per accedere al tuo negozio.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); setResult(null) }}
                    placeholder="la.tua@email.com"
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Ricerca in corso...</>
                ) : (
                  'Vai al tuo pannello'
                )}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Result — redirect link */}
            {result && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">{result.businessName}</span>
                </div>
                <p className="text-xs text-emerald-600 mb-3">
                  Trovato! Il tuo pannello admin e su <strong>{result.slug}.intelligenda.it</strong>
                </p>
                <a
                  href={result.adminUrl}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Accedi al pannello <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-stone-400 mt-6">
            Non hai ancora un negozio?{' '}
            <a href="/#registrati" className="text-stone-900 font-medium hover:underline">
              Registrati qui
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
