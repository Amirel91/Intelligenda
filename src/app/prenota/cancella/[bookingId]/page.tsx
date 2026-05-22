'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarX, ArrowLeft, Clock, AlertTriangle, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface BookingDetail {
  id: string
  customerName: string
  customerSurname: string
  startTime: string
  endTime: string
  totalPrice: number
  status: string
  shopName?: string
  services: { service: { name: string; price: number } }[]
}

export default function CancellaPrenotazione() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.bookingId as string

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingId) return
    // Fetch booking details — we use the cancel API just to read, or we can add a GET
    // For simplicity, we'll create a lightweight read via a dedicated endpoint
    fetch(`/api/bookings/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, dryRun: true }),
    }).then(res => {
      if (!res.ok) throw new Error()
      return res.json()
    }).then(data => {
      if (data.booking) setBooking(data.booking)
      setLoading(false)
    }).catch(() => {
      // Fallback: try fetching from the public bookings lookup
      setLoading(false)
      setError('Prenotazione non trovata o scaduta')
    })
  }, [bookingId])

  const handleCancel = async () => {
    setCancelling(true)
    setError('')
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante la cancellazione')
        return
      }

      setCancelled(true)
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setCancelling(false)
    }
  }

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full p-6 bg-white rounded-2xl shadow-lg border border-stone-100 text-center"
        >
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Prenotazione Annullata</h1>
          <p className="text-stone-500 text-sm mb-6">
            La tua prenotazione e stata cancellata con successo.
            Lo slot e ora di nuovo disponibile per gli altri utenti.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla Home
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-md w-full p-6 bg-white rounded-2xl shadow-lg border border-stone-100"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <CalendarX className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Annulla Prenotazione</h1>
            <p className="text-xs text-stone-500">Conferma per liberare lo slot sul calendario</p>
          </div>
        </div>

        {error && !booking && (
          <div className="p-4 rounded-xl bg-stone-50 text-stone-600 text-sm text-center">
            {error}
          </div>
        )}

        {booking && (
          <>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-stone-500">Cliente</span>
                <span className="font-medium text-stone-900">{booking.customerName} {booking.customerSurname}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-stone-500">Data e Ora</span>
                <span className="font-medium text-stone-900 text-right">{formatDateTime(booking.startTime)}</span>
              </div>
              {booking.services && booking.services.length > 0 && (
                <div className="border-t border-stone-200 pt-2 space-y-1">
                  {booking.services.map(bs => (
                    <div key={bs.service.name} className="flex justify-between">
                      <span className="text-stone-600">{bs.service.name}</span>
                      <span className="font-medium">€{bs.service.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-stone-200 pt-2">
                <span>Totale</span>
                <span>€{booking.totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-6">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Questa azione e irreversibile. Lo slot verra liberato immediatamente e altri utenti potranno prenotarlo.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors text-center"
              >
                Torna Indietro
              </Link>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Annullamento...
                  </>
                ) : (
                  'Conferma Cancellazione'
                )}
              </button>
            </div>
          </>
        )}

        {!booking && !error && (
          <Link
            href="/"
            className="block w-full py-3 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors text-center"
          >
            Torna alla Home
          </Link>
        )}
      </motion.div>
    </div>
  )
}
