'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore nella richiesta')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella richiesta')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
            <Mail className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Email inviata!</h1>
          <p className="text-stone-500 text-sm mb-6">
            Se l&apos;indirizzo email è associato a un account IntelliGenda, riceverai un link per reimpostare la password.
            Controlla anche la cartella spam.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-stone-900 flex items-center justify-center">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">Password dimenticata?</h1>
          <p className="text-stone-500 text-sm mt-1">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="la-tua@email.it"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                Invio...
              </div>
            ) : (
              'Invia link di reset'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al login
          </Link>
        </div>
      </div>
    </div>
  )
}
