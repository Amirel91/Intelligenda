'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shopName, setShopName] = useState<string | null>(null)
  const [shopError, setShopError] = useState(false)

  // Fetch shop name from config
  useEffect(() => {
    fetch('/api/config')
      .then(res => {
        if (!res.ok) {
          setShopError(true)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data && typeof data === 'object' && 'shopName' in data) {
          setShopName(data.shopName as string)
        } else {
          setShopError(true)
        }
      })
      .catch(() => setShopError(true))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Credenziali non valide')
      }

      // Use window.location for a full page navigation (ensures cookie is sent)
      window.location.href = '/admin/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di login')
      setLoading(false)
    }
  }

  if (shopError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Errore</h1>
          <p className="text-stone-500 text-sm mb-6">Nessun negozio selezionato.</p>
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
            ← Torna al sito
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
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">Area Admin</h1>
          <p className="text-stone-500 text-sm mt-1">
            {shopName ? (
              <>Accedi a <span className="font-medium text-stone-700">{shopName}</span></>
            ) : (
              'Caricamento...'
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                Accesso...
              </div>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <a
            href="/admin/forgot-password"
            className="block text-sm text-stone-500 hover:text-stone-800 font-medium transition-colors cursor-pointer"
          >
            Password dimenticata?
          </a>
          <Link href="/" className="block text-sm text-stone-400 hover:text-stone-600 transition-colors">
            ← Torna al sito
          </Link>
        </div>
      </div>
    </div>
  )
}
