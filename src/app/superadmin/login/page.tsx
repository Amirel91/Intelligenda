'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'
import { ThemeToggle } from '@/components/ThemeToggle'

const SA_TOKEN_KEY = 'superadmin_token'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password) {
      setError('Inserisci la password')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il login')
        return
      }

      // Store the JWT token in localStorage
      if (data.token) {
        localStorage.setItem(SA_TOKEN_KEY, data.token)
      }

      router.push('/superadmin')
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center px-6 relative">
      {/* ThemeToggle in top-right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <IntelliGendaLogo size="xl" showText={false} className="text-stone-900 dark:text-stone-100" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">SuperAdmin</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">IntelliGenda — Pannello di controllo piattaforma</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Password SuperAdmin</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Inserisci la password"
                className="w-full px-4 py-3 pr-11 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accedi al pannello'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna al sito
          </Link>
        </div>
      </div>
    </div>
  )
}
