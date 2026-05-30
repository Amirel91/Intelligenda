'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, X, Phone, Mail, Clock, Euro, User,
  CalendarX, CalendarCheck, Printer, Trash2, Plus, Calendar, List, Lock,
  MessageCircle,
} from 'lucide-react'

interface BookingWithServices {
  id: string
  customerName: string
  customerSurname: string
  customerPhone: string
  customerEmail?: string
  startTime: string
  endTime: string
  totalPrice: number
  discountApplied?: number | null
  finalPrice?: number | null
  status: string
  resource?: { id: string; name: string } | null
  services: { service: { name: string; price: number; durationMinutes: number; cleanupMinutes: number } }[]
}

interface ClosedDate {
  id: string
  date: string
  reason: string
}

export default function AdminCalendario() {
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingWithServices[]>([])
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithServices | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  const [closeDateModal, setCloseDateModal] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [closeSaving, setCloseSaving] = useState(false)

  // Time block modal state
  const [blockModal, setBlockModal] = useState(false)
  const [blockTitle, setBlockTitle] = useState('')
  const [blockTime, setBlockTime] = useState('')
  const [blockDuration, setBlockDuration] = useState('30')
  const [blockSaving, setBlockSaving] = useState(false)
  const [shopName, setShopName] = useState('')

  const fetchMonthData = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

    Promise.all([
      fetch(`/api/bookings?from=${from}T00:00:00&to=${to}T23:59:59`).then(r => r.json()),
      fetch(`/api/closed-dates?from=${from}&to=${to}`).then(r => r.json()),
    ]).then(([bk, cd]) => {
      setBookings(Array.isArray(bk) ? bk : [])
      setClosedDates(Array.isArray(cd) ? cd : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchMonthData() }, [currentMonth])

  // Fetch shop name for WhatsApp messages
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.shopName) setShopName(data.shopName) })
      .catch(() => {})
  }, [])

  // Pre-compute bookings grouped by date string for O(1) lookup instead of O(N) per cell
  const bookingsByDateMap = new Map<string, BookingWithServices[]>()
  for (const b of bookings) {
    const ds = new Date(b.startTime).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
    const existing = bookingsByDateMap.get(ds)
    if (existing) existing.push(b)
    else bookingsByDateMap.set(ds, [b])
  }

  // Pre-compute closed date set for O(1) lookup
  const closedDateSet = new Set(closedDates.map(cd => cd.date))

  const isDateClosed = (dateStr: string) => closedDateSet.has(dateStr)

  const handleToggleCloseDay = async (dateStr: string) => {
    if (isDateClosed(dateStr)) {
      // Open the day
      const cd = closedDates.find(c => c.date === dateStr)
      if (cd) {
        await fetch(`/api/closed-dates?date=${dateStr}`, { method: 'DELETE' })
        fetchMonthData()
      }
    } else {
      // Ask for reason
      setClosingDate(dateStr)
      setCloseReason('')
      setCloseDateModal(true)
    }
  }

  const handleConfirmCloseDay = async () => {
    if (!closingDate) return
    setCloseSaving(true)
    try {
      await fetch('/api/closed-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: closingDate, reason: closeReason }),
      })
      setCloseDateModal(false)
      fetchMonthData()
    } catch { /* silent */ }
    finally { setCloseSaving(false) }
  }

  const bookingsByDate = (dateStr: string) => bookingsByDateMap.get(dateStr) || []

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  const calendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const days: { date: number; dateStr: string; isPast: boolean; isToday: boolean }[] = []
    for (let i = 0; i < startOffset; i++) days.push({ date: 0, dateStr: '', isPast: true, isToday: false })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dateObj = new Date(year, month, d)
      days.push({ date: d, dateStr, isPast: dateObj < today, isToday: dateObj.getTime() === today.getTime() })
    }
    return days
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // Accepts both "YYYY-MM-DD" and ISO strings — used for booking display
  const formatDisplayDate = (isoOrDate: string) => {
    const d = new Date(isoOrDate)
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
  }

  const formatTime = (isoStr: string) => new Date(isoStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })

  const dayBookings = selectedDate ? bookingsByDate(selectedDate) : []

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const updateBookingStatus = async (id: string, status: string) => {
    await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, status } : null)
  }

  const deleteBooking = async (id: string) => {
    setDeleting(true)
    try {
      await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
      setBookings(prev => prev.filter(b => b.id !== id))
      if (selectedBooking?.id === id) setSelectedBooking(null)
      setDeleteConfirm(null)
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

  const statusColors: Record<string, string> = { confirmed: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-700', blocked: 'bg-stone-200 text-stone-600' }
  const statusLabels: Record<string, string> = { confirmed: 'Confermata', pending: 'In attesa', cancelled: 'Annullata', blocked: 'Bloccato' }

  const openWhatsApp = (b: BookingWithServices) => {
    const phone = b.customerPhone.replace(/[^0-9]/g, '')
    const date = formatDisplayDate(b.startTime)
    const time = formatTime(b.startTime)
    const services = b.services.map(s => s.service.name).join(', ')
    const cancelUrl = `${window.location.origin}/prenota/cancella/${b.id}`
    const text = encodeURIComponent(
      `Ciao ${b.customerName}, ti ricordiamo il tuo appuntamento del ${date} alle ore ${time} presso ${shopName || 'la nostra attivita'}. Servizi: ${services}. Se hai bisogno di disdire o modificare, puoi farlo in un click da qui: ${cancelUrl}. A presto!`
    )
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" /></div>)
  }

  return (
    <div>
      {/* Print header - only visible when printing */}
      <div className="print-header hidden print:block print:mb-4">
        <h1 className="text-xl font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()} - Calendario Prenotazioni</h1>
      </div>

      {/* Header - Desktop: full buttons, Mobile: title + plus icon */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Calendario</h1>
          <p className="text-stone-500 text-sm mt-1 hidden sm:block">Visualizza e gestisci le prenotazioni</p>
        </div>
        <div className="flex items-center gap-2">
          {/* New booking button */}
          <button
            onClick={() => router.push('/admin/prenota')}
            className="print:hidden flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuova Prenotazione</span>
          </button>
          {/* Print button - visible from sm+ */}
          <button
            onClick={() => window.print()}
            className="print:hidden hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Stampa</span>
          </button>
          {/* View toggle - visible from sm+ */}
          <div className="print:hidden hidden sm:flex items-center gap-2 bg-white rounded-lg border border-stone-200 p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden md:inline">Mese</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile compact toolbar: view toggle + print */}
      <div className="flex items-center justify-end gap-2 mb-4 sm:hidden print:hidden">
        <div className="flex items-center gap-1 bg-white rounded-lg border border-stone-200 p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'month' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            title="Vista Mese"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            title="Vista Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
          title="Stampa"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1 print:gap-4">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-2 sm:p-4 print:col-span-1 print:border print:border-stone-300 print:p-3">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-stone-100 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <span className="font-semibold text-stone-900 text-sm sm:text-base">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
              <button onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-stone-100 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 mb-1 sm:mb-2">{dayNames.map(d => (<div key={d} className="text-center text-[10px] sm:text-xs font-medium text-stone-400 py-1 sm:py-2">{d}</div>))}</div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {calendarDays().map((day, i) => {
                const dayBks = day.dateStr ? bookingsByDate(day.dateStr) : []
                const closed = day.dateStr ? isDateClosed(day.dateStr) : false
                return (
                  <button
                    key={i}
                    disabled={day.date === 0}
                    onClick={() => day.dateStr && setSelectedDate(day.dateStr)}
                    className={`min-h-[44px] sm:min-h-[70px] rounded-lg p-1 sm:p-1.5 text-left transition-all text-xs relative ${
                      day.date === 0 ? '' :
                      closed ? 'bg-red-50 border border-red-200' :
                      selectedDate === day.dateStr ? 'bg-stone-900 text-white' :
                      day.isToday ? 'bg-blue-50 border border-blue-200' :
                      'bg-stone-50 hover:bg-stone-100'
                    } ${day.date > 0 ? 'cursor-pointer' : ''}`}
                  >
                    {day.date > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <div className={`font-medium text-xs sm:text-sm ${selectedDate === day.dateStr ? 'text-white' : closed ? 'text-red-500' : 'text-stone-700'}`}>
                            {day.date}
                          </div>
                          {!closed && dayBks.length > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center ${
                              selectedDate === day.dateStr ? 'bg-white/20 text-white' : 'bg-stone-900 text-white'
                            }`}>
                              {dayBks.length}
                            </span>
                          )}
                        </div>
                        {closed && (
                          <div className="flex items-center gap-0.5 text-[10px] text-red-500 mt-0.5">
                            <CalendarX className="w-3 h-3" />
                            <span className="hidden sm:inline">Chiuso</span>
                          </div>
                        )}
                        {!closed && dayBks.length > 0 && (
                          <div className={`text-[10px] leading-tight mt-1 hidden sm:block ${selectedDate === day.dateStr ? 'text-stone-300' : 'text-stone-500'}`}>
                            {dayBks.slice(0, 2).map(b => (<div key={b.id} className="truncate">{formatTime(b.startTime)} {b.customerName}</div>))}
                            {dayBks.length > 2 && (<div>+{dayBks.length - 2} altro{dayBks.length > 3 ? 'i' : ''}</div>)}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day Detail Panel - Desktop: Side panel */}
          <div className="hidden lg:block bg-white rounded-xl border border-stone-200 p-4 print:hidden">
            <h3 className="font-semibold text-stone-900 mb-4">{selectedDate ? formatDate(selectedDate) : 'Seleziona un giorno'}</h3>

            {selectedDate && (
              <button
                onClick={() => handleToggleCloseDay(selectedDate)}
                className={`w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isDateClosed(selectedDate)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                }`}
              >
                {isDateClosed(selectedDate) ? (<><CalendarCheck className="w-4 h-4" /> Riapri giornata</>) : (<><CalendarX className="w-4 h-4" /> Chiudi giornata</>)}
              </button>
            )}

            {selectedDate && !isDateClosed(selectedDate) && (
              <button
                onClick={() => { setBlockTitle(''); setBlockTime('09:00'); setBlockDuration('30'); setBlockModal(true) }}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 transition-all"
              >
                <Lock className="w-4 h-4" /> Blocca fascia oraria
              </button>
            )}

            {selectedDate && isDateClosed(selectedDate) && (() => {
              const cd = closedDates.find(c => c.date === selectedDate)
              return cd?.reason ? (<p className="mb-3 text-xs text-stone-500 text-center">Motivo: {cd.reason}</p>) : null
            })()}

            {dayBookings.length === 0 ? (
              <p className="text-stone-400 text-sm py-8 text-center">
                {selectedDate
                  ? (isDateClosed(selectedDate) ? 'Giornata chiusa' : 'Nessuna prenotazione per questo giorno')
                  : 'Clicca su un giorno del calendario'}
              </p>
            ) : (
              <div className="space-y-3">
                {dayBookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(booking => (
                  <button key={booking.id} onClick={() => setSelectedBooking(booking)} className="w-full text-left p-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-stone-900 text-sm">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[booking.status] || ''}`}>{statusLabels[booking.status] || booking.status}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-stone-600 truncate">{booking.customerName} {booking.customerSurname}</span>
                      {booking.status !== 'cancelled' && booking.status !== 'blocked' && booking.customerPhone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openWhatsApp(booking) }}
                          className="shrink-0 p-2 rounded-full bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Invia promemoria WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-1">{booking.services.map(bs => bs.service.name).join(', ')} &middot; <span className={booking.discountApplied != null && booking.discountApplied > 0 ? 'line-through text-stone-400' : ''}>EUR{booking.totalPrice.toFixed(2)}</span>{booking.discountApplied != null && booking.discountApplied > 0 && <span className="text-emerald-600 font-medium"> EUR{(booking.finalPrice ?? booking.totalPrice).toFixed(2)}</span>}</div>
                    {booking.resource && (
                      <div className="mt-1">
                        <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">{booking.resource.name}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200">
          {/* Mobile: Card-based list view */}
          <div className="md:hidden">
            {bookings.length === 0 ? (
              <div className="px-4 py-8 text-center text-stone-400 text-sm">Nessuna prenotazione questo mese</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {bookings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(booking => (
                  <div key={booking.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-stone-900 text-sm">{booking.customerName} {booking.customerSurname}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{formatDisplayDate(booking.startTime)}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${statusColors[booking.status] || ''}`}>{statusLabels[booking.status] || booking.status}</span>
                    </div>
                    <div className="text-sm text-stone-600 mb-3">{booking.services.map(bs => bs.service.name).join(', ')}</div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900 text-sm">EUR{(booking.finalPrice ?? booking.totalPrice).toFixed(2)}</span>
                        {booking.discountApplied != null && booking.discountApplied > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">-€{booking.discountApplied.toFixed(2)}</span>
                        )}
                        {booking.resource && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">{booking.resource.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {booking.status !== 'cancelled' && booking.status !== 'blocked' && booking.customerPhone && (
                          <button
                            onClick={() => openWhatsApp(booking)}
                            className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Invia promemoria WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setSelectedBooking(booking)} className="text-xs px-2 py-1.5 rounded-md text-stone-600 hover:bg-stone-100 transition-colors">Dettagli</button>
                        {booking.status !== 'cancelled' && (
                          <button onClick={() => updateBookingStatus(booking.id, 'cancelled')} className="text-xs px-2 py-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors">Annulla</button>
                        )}
                        {deleteConfirm === booking.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => deleteBooking(booking.id)} disabled={deleting} className="text-xs px-2 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">Conferma</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors">No</button>
                          </span>
                        ) : (
                          <button onClick={() => setDeleteConfirm(booking.id)} className="text-xs px-2 py-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Ora</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Servizi</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Totale</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase hidden lg:table-cell">Postazione</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Stato</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase print:hidden">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-stone-400 text-sm">Nessuna prenotazione questo mese</td></tr>
                ) : (
                  bookings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(booking => (
                    <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3 text-sm">{formatDisplayDate(booking.startTime)}</td>
                      <td className="px-4 py-3 text-sm">{formatTime(booking.startTime)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{booking.customerName} {booking.customerSurname}</td>
                      <td className="px-4 py-3 text-sm text-stone-500">{booking.services.map(bs => bs.service.name).join(', ')}</td>
                      <td className="px-4 py-3 text-sm font-medium">EUR{booking.totalPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">{booking.resource ? <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-600 font-medium">{booking.resource.name}</span> : null}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[booking.status] || ''}`}>{statusLabels[booking.status] || booking.status}</span></td>
                      <td className="px-4 py-3 print:hidden">
                        <div className="flex items-center gap-1">
                          {booking.status !== 'cancelled' && booking.status !== 'blocked' && booking.customerPhone && (
                            <button
                              onClick={() => openWhatsApp(booking)}
                              className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Invia promemoria WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {booking.status !== 'cancelled' && (<button onClick={() => updateBookingStatus(booking.id, 'cancelled')} className="text-xs px-2 py-1 rounded-md text-amber-600 hover:bg-amber-50 transition-colors">Annulla</button>)}
                          {deleteConfirm === booking.id ? (
                            <span className="flex items-center gap-1">
                              <button onClick={() => deleteBooking(booking.id)} disabled={deleting} className="text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">Conferma</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded-md text-stone-500 hover:bg-stone-100 transition-colors">No</button>
                            </span>
                          ) : (
                            <button onClick={() => setDeleteConfirm(booking.id)} className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3" />Elimina</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile: Day Detail Bottom Sheet */}
      <AnimatePresence>
        {selectedDate && (
          <>
            {/* Backdrop - tap to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelectedDate(null)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-stone-200 max-h-[70vh] overflow-y-auto"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
                <div className="w-10 h-1 rounded-full bg-stone-300" />
              </div>
              {/* Close button */}
              <div className="flex items-center justify-between px-4 pb-2">
                <h3 className="font-semibold text-stone-900">{formatDate(selectedDate)}</h3>
                <button onClick={() => setSelectedDate(null)} className="p-2 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Chiudi">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Close/Reopen day button */}
              <div className="px-4 pb-3">
                <button
                  onClick={() => handleToggleCloseDay(selectedDate)}
                  className={`w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isDateClosed(selectedDate)
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  {isDateClosed(selectedDate) ? (<><CalendarCheck className="w-4 h-4" /> Riapri giornata</>) : (<><CalendarX className="w-4 h-4" /> Chiudi giornata</>)}
                </button>
                {!isDateClosed(selectedDate) && (
                  <button
                    onClick={() => { setBlockTitle(''); setBlockTime('09:00'); setBlockDuration('30'); setBlockModal(true) }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 transition-all"
                  >
                    <Lock className="w-4 h-4" /> Blocca fascia oraria
                  </button>
                )}
              </div>

              {/* Closed reason */}
              {isDateClosed(selectedDate) && (() => {
                const cd = closedDates.find(c => c.date === selectedDate)
                return cd?.reason ? (<p className="px-4 pb-3 text-xs text-stone-500 text-center">Motivo: {cd.reason}</p>) : null
              })()}

              {/* Bookings list */}
              <div className="px-4 pb-6">
                {dayBookings.length === 0 ? (
                  <p className="text-stone-400 text-sm py-6 text-center">
                    {isDateClosed(selectedDate) ? 'Giornata chiusa' : 'Nessuna prenotazione per questo giorno'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dayBookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(booking => (
                      <button key={booking.id} onClick={() => setSelectedBooking(booking)} className="w-full text-left p-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-stone-900 text-sm">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[booking.status] || ''}`}>{statusLabels[booking.status] || booking.status}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-stone-600 truncate">{booking.customerName} {booking.customerSurname}</span>
                          {booking.status !== 'cancelled' && booking.status !== 'blocked' && booking.customerPhone && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openWhatsApp(booking) }}
                              className="shrink-0 p-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Invia promemoria WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-1">{booking.services.map(bs => bs.service.name).join(', ')} &middot; <span className={booking.discountApplied != null && booking.discountApplied > 0 ? 'line-through text-stone-400' : ''}>EUR{booking.totalPrice.toFixed(2)}</span>{booking.discountApplied != null && booking.discountApplied > 0 && <span className="text-emerald-600 font-medium"> EUR{(booking.finalPrice ?? booking.totalPrice).toFixed(2)}</span>}</div>
                        {booking.resource && (
                          <div className="mt-1">
                            <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">{booking.resource.name}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Close Day Modal */}
      <AnimatePresence>
        {closeDateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
            onClick={() => setCloseDateModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-4 sm:p-6 shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">Chiudi Giornata</h2>
                <button onClick={() => setCloseDateModal(false)} className="p-2 rounded-lg hover:bg-stone-100"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-stone-500 text-sm mb-4">Chiudere la giornata del <strong>{closingDate}</strong>? I clienti non potranno prenotare in questa data.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Motivo (opzionale)</label>
                <input type="text" value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="es. Ferie, Festivo, Malattia..." className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCloseDateModal(false)} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors">Annulla</button>
                <button onClick={handleConfirmCloseDay} disabled={closeSaving} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">{closeSaving ? 'Salvataggio...' : 'Conferma Chiusura'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Detail Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h2 className="text-lg font-semibold text-stone-900">Dettaglio Prenotazione</h2>
                <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-lg hover:bg-stone-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[selectedBooking.status] || ''}`}>{statusLabels[selectedBooking.status] || selectedBooking.status}</span>
                  {selectedBooking.status !== 'cancelled' && (<button onClick={() => updateBookingStatus(selectedBooking.id, 'cancelled')} className="text-xs px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors">Annulla Prenotazione</button>)}
                </div>
                <div className="flex items-center gap-3 text-stone-700">
                  <Clock className="w-5 h-5 text-stone-400 shrink-0" />
                  <div>
                    <div className="font-medium">{formatDisplayDate(selectedBooking.startTime)}</div>
                    <div className="text-sm text-stone-500">{formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-stone-700">
                  <User className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    {selectedBooking.status === 'blocked' ? (
                      <div className="font-medium">{selectedBooking.customerName}</div>
                    ) : (
                      <>
                        <div className="font-medium">{selectedBooking.customerName} {selectedBooking.customerSurname}</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 mt-0.5">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedBooking.customerPhone}</span>
                          <button
                            onClick={() => openWhatsApp(selectedBooking)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
                            title="Invia promemoria WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span className="text-xs font-medium">WhatsApp</span>
                          </button>
                          {selectedBooking.customerEmail && (<span className="flex items-center gap-1 break-all"><Mail className="w-3 h-3" /> {selectedBooking.customerEmail}</span>)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-stone-700 mb-2">
                    Servizi
                    {selectedBooking.resource && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium align-middle">{selectedBooking.resource.name}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedBooking.services.map(bs => (
                      <div key={bs.service.name} className="flex justify-between text-sm p-2 rounded-lg bg-stone-50">
                        <span className="text-stone-700">{bs.service.name}</span>
                        <span className="text-stone-500 shrink-0 ml-2">EUR{bs.service.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                  <div className="flex items-center gap-2 font-semibold text-stone-900"><Euro className="w-5 h-5" />Totale</div>
                  <div className="text-right">
                    {selectedBooking.discountApplied != null && selectedBooking.discountApplied > 0 && (
                      <div className="text-xs text-emerald-600 font-medium mb-0.5">Sconto -EUR{selectedBooking.discountApplied.toFixed(2)}</div>
                    )}
                    <span className="text-xl font-bold text-stone-900">EUR{(selectedBooking.finalPrice ?? selectedBooking.totalPrice).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-stone-100 flex-wrap">
                  {deleteConfirm === selectedBooking.id ? (
                    <>
                      <p className="text-sm text-red-600 flex-1">Eliminare definitivamente?</p>
                      <button onClick={() => deleteBooking(selectedBooking.id)} disabled={deleting} className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">{deleting ? 'Eliminazione...' : 'Elimina'}</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors">Annulla</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(selectedBooking.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"><Trash2 className="w-4 h-4" />Elimina prenotazione</button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Block Modal */}
      <AnimatePresence>
        {blockModal && selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
            onClick={() => setBlockModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-4 sm:p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-900">Blocca fascia oraria</h2>
                <button onClick={() => setBlockModal(false)} className="p-2 rounded-lg hover:bg-stone-100"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Titolo *</label>
                  <input
                    type="text"
                    value={blockTitle}
                    onChange={e => setBlockTitle(e.target.value)}
                    placeholder="es. Pausa pranzo, Appuntamento telefonico"
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Ora inizio</label>
                    <input
                      type="time"
                      value={blockTime}
                      onChange={e => setBlockTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Durata (min)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={blockDuration}
                      onChange={e => setBlockDuration(e.target.value)}
                      placeholder="30"
                      className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setBlockModal(false)} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors">Annulla</button>
                <button
                  onClick={async () => {
                    if (!blockTitle.trim()) return
                    setBlockSaving(true)
                    try {
                      const res = await fetch('/api/time-blocks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: blockTitle.trim(), date: selectedDate, startTime: blockTime, durationMinutes: parseInt(blockDuration) || 30 }),
                      })
                      if (!res.ok) { const d = await res.json(); alert(d.error || 'Errore'); return }
                      setBlockModal(false)
                      fetchMonthData()
                    } catch { alert('Errore di connessione') }
                    finally { setBlockSaving(false) }
                  }}
                  disabled={blockSaving || !blockTitle.trim()}
                  className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {blockSaving ? 'Salvataggio...' : 'Blocca'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
