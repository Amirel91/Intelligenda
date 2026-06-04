'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Clock, MapPin, User, Mail, Phone, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { CustomerNavbar } from '@/components/CustomerNavbar'

interface CustomerData {
  id: string
  nome: string
  telefono: string
  email: string
}

interface Booking {
  id: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  services: { name: string; durationMinutes: number }[]
  resource: string | null
  createdAt: string
}

export default function ProfiloPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadBookings = async () => {
    try {
      const bookRes = await fetch('/api/customer/bookings')
      if (bookRes.ok) {
        const bookData = await bookRes.json()
        setBookings(Array.isArray(bookData) ? bookData : [])
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    const load = async () => {
      try {
        // Check auth
        const meRes = await fetch('/api/auth/customer/me')
        const meData = await meRes.json()
        if (!meData.authenticated) {
          router.replace('/login')
          return
        }
        setCustomer(meData.customer)

        // Load bookings
        await loadBookings()
      } catch {
        setError('Errore nel caricamento dei dati')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Vuoi annullare questa prenotazione?')) return
    setCancelling(bookingId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Errore nella cancellazione')
      }
      // Re-fetch bookings from server to ensure data is fresh
      await loadBookings()
      setSuccess('Prenotazione annullata con successo')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella cancellazione')
    } finally {
      setCancelling(null)
    }
  }

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  const isFuture = (isoStr: string) => new Date(isoStr) > new Date()

  const futureBookings = bookings.filter(b => isFuture(b.startTime) && b.status !== 'cancelled')
  const pastBookings = bookings.filter(b => !isFuture(b.startTime) || b.status === 'cancelled')

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white dark:from-stone-800 dark:to-stone-900">
        <CustomerNavbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400 dark:text-stone-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white dark:from-stone-800 dark:to-stone-900">
      <CustomerNavbar />

      <main className="flex-1 px-4 py-6 pt-16">
        <div className="max-w-lg mx-auto">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Link>

          {/* Profile header */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm mb-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-stone-900 dark:bg-stone-100 flex items-center justify-center shrink-0">
                <span className="text-xl font-semibold text-white dark:text-stone-900">
                  {customer?.nome?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{customer?.nome || 'Cliente'}</h1>
                <p className="text-sm text-stone-500 dark:text-stone-400">Il tuo profilo</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                <span className="text-stone-700 dark:text-stone-300">{customer?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
                <span className="text-stone-700 dark:text-stone-300">
                  {customer?.telefono?.startsWith('temp_') ? 'Non impostato' : (customer?.telefono || '—')}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
              <Link
                href="/prenota"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                Prenota un appuntamento
              </Link>
            </div>
          </div>

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Upcoming bookings */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3 px-1">
              Prossimi appuntamenti
            </h2>
            {futureBookings.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 text-center">
                <CalendarDays className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                <p className="text-sm text-stone-400 dark:text-stone-500">Nessun appuntamento programmato</p>
                <Link href="/prenota" className="text-sm text-stone-900 dark:text-stone-100 font-medium hover:underline mt-1 inline-block">
                  Prenota ora
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {futureBookings.map(booking => (
                  <div key={booking.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
                          {formatDate(booking.startTime)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                          <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                            {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                        Confermato
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {booking.services.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 text-xs">
                          {s.name} ({s.durationMinutes} min)
                        </span>
                      ))}
                    </div>

                    {booking.resource && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.resource}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {booking.totalPrice.toFixed(2)} euro
                      </span>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancelling === booking.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-50 transition-colors"
                      >
                        {cancelling === booking.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        Annulla
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3 px-1">
                Storico
              </h2>
              <div className="space-y-2">
                {pastBookings.map(booking => (
                  <div key={booking.id} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-stone-400 dark:text-stone-500">
                          {formatDate(booking.startTime)}
                        </p>
                        <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5">
                          {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {booking.services.map((s, i) => (
                            <span key={i} className="text-xs text-stone-500 dark:text-stone-400">{s.name}</span>
                          ))}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'cancelled'
                          ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                      }`}>
                        {booking.status === 'cancelled' ? 'Annullato' : 'Completato'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
