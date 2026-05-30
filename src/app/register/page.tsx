'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Check, Loader2, User, Phone } from 'lucide-react'
import { CustomerNavbar } from '@/components/CustomerNavbar'

export default function CustomerRegisterPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !telefono.trim() || !email.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore nella registrazione')
      }
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/customer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otpCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Codice non valido')
      }
      setStep('success')
      setTimeout(() => router.push('/'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white">
      <CustomerNavbar />

      <main className="flex-1 flex items-center justify-center px-6 pt-12 pb-6">
        <div className="w-full max-w-sm">

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Registrati</h1>
            <p className="text-stone-500 text-sm mt-1.5 leading-relaxed">
              Crea il tuo account per gestire le tue prenotazioni.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step !== 'form' ? 'bg-stone-900' : 'bg-stone-200'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'otp' || step === 'success' ? 'bg-stone-900' : 'bg-stone-200'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'success' ? 'bg-stone-900' : 'bg-stone-200'}`} />
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            {step === 'form' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      value={nome}
                      onChange={e => { setNome(e.target.value); setError('') }}
                      placeholder="Mario Rossi"
                      required
                      autoFocus
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Telefono</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="tel"
                      value={telefono}
                      onChange={e => { setTelefono(e.target.value); setError('') }}
                      placeholder="+39 333 1234567"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      placeholder="la.tua@email.com"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !nome.trim() || !telefono.trim() || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Registrazione in corso...</>
                  ) : (
                    'Crea account e invia codice'
                  )}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-stone-600" />
                  </div>
                  <p className="text-sm text-stone-600">
                    Codice inviato a <strong className="text-stone-900">{email}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Codice a 6 cifre</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setError('') }}
                    placeholder="000000"
                    required
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-center text-2xl font-bold tracking-[0.2em]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Verifica...</>
                  ) : (
                    <><Check className="w-4 h-4" />Verifica codice</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('form'); setOtpCode(''); setError('') }}
                  className="w-full text-center text-sm text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Torna al form di registrazione
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-stone-900 mb-1">Account verificato!</h3>
                <p className="text-sm text-stone-500">Reindirizzamento in corso...</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <p className="text-center text-sm text-stone-400 mt-6">
            Hai gia un account?{' '}
            <Link href="/login" className="text-stone-900 font-medium hover:underline">
              Accedi qui
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
