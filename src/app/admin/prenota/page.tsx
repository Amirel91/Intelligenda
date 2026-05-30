'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Clock,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  CalendarX,
} from 'lucide-react'

// ==================== TYPES ====================

interface Service {
  id: string
  name: string
  description?: string
  price: number
  durationMinutes: number
  cleanupMinutes: number
  active: boolean
}

interface BookingData {
  serviceIds: string[]
  date: string
  time: string
  customer: {
    customerName: string
    customerSurname: string
    customerPhone: string
    customerEmail: string
  }
}

type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none'

// ==================== MAIN COMPONENT ====================

export default function AdminPrenota() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [booking, setBooking] = useState<BookingData>({
    serviceIds: [],
    date: '',
    time: '',
    customer: {
      customerName: '',
      customerSurname: '',
      customerPhone: '',
      customerEmail: '',
    },
  })

  const [rememberMe, setRememberMe] = useState(false)
  const STORAGE_KEY = 'admin_booking_remember'

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [dayAvailabilities, setDayAvailabilities] = useState<Record<string, AvailabilityLevel>>({})
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [closedDates, setClosedDates] = useState<string[]>([])

  // Load remembered customer data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        setBooking(prev => ({
          ...prev,
          customer: {
            ...prev.customer,
            customerName: data.customerName || '',
            customerSurname: data.customerSurname || '',
            customerPhone: data.customerPhone || '',
          },
        }))
        setRememberMe(true)
      }
    } catch {}
  }, [])

  // Fetch services on mount
  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        setServices(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Fetch closed dates when entering step 2
  useEffect(() => {
    if (step === 2) {
      fetch('/api/closed-dates')
        .then(r => r.json())
        .then(data => setClosedDates(Array.isArray(data) ? data.map((d: { date: string }) => d.date) : []))
        .catch(() => setClosedDates([]))
    }
  }, [step])

  const closedDateSet = new Set(closedDates)
  const isDayClosed = (dateStr: string) => closedDateSet.has(dateStr)

  const totalServiceDuration = booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + (s?.durationMinutes || 0)
  }, 0)
  const totalCleanupDuration = booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + ((s as Service)?.cleanupMinutes || 0)
  }, 0)
  const totalDuration = totalServiceDuration + totalCleanupDuration

  const totalPrice = booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + (s?.price || 0)
  }, 0)

  const selectedServices = booking.serviceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[]
  const totalCleanupInList = selectedServices.reduce((sum, s) => sum + (s.cleanupMinutes || 0), 0)

  const toggleService = (id: string) => {
    setBooking(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter(sid => sid !== id)
        : [...prev.serviceIds, id],
    }))
  }

  // ==================== CALENDAR ====================

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchMonthAvailability = useCallback(async (year: number, month: number) => {
    if (totalDuration === 0) return
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

      const res = await fetch(`/api/slots/batch?startDate=${startDate}&endDate=${endDate}&duration=${totalDuration}`)
      if (!res.ok) throw new Error('Failed to fetch batch availability')

      const data = await res.json()
      setDayAvailabilities(data || {})
    } catch (e) {
      console.error('Error fetching batch availability:', e)
    }
  }, [totalDuration])

  useEffect(() => {
    if (step === 2) {
      fetchMonthAvailability(calendarMonth.getFullYear(), calendarMonth.getMonth())
    }
  }, [step, calendarMonth, fetchMonthAvailability])

  const fetchSlotsForDate = async (dateStr: string) => {
    setLoadingSlots(true)
    setBooking(prev => ({ ...prev, date: dateStr, time: '' }))
    try {
      const res = await fetch(`/api/slots?date=${dateStr}&duration=${totalDuration}`)
      const data = await res.json()
      setAvailableSlots(data.slots || [])
    } catch {
      setAvailableSlots([])
    }
    setLoadingSlots(false)
  }

  const calendarDays = () => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = firstDay === 0 ? 6 : firstDay - 1

    const days: { date: number; dateStr: string; isPast: boolean; isToday: boolean }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < startOffset; i++) {
      days.push({ date: 0, dateStr: '', isPast: true, isToday: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dateObj = new Date(year, month, d)
      days.push({ date: d, dateStr, isPast: dateObj < today, isToday: dateObj.getTime() === today.getTime() })
    }
    return days
  }

  const getDayColor = (dateStr: string, isPast: boolean) => {
    if (isDayClosed(dateStr)) return 'text-red-500 bg-red-50'
    const avail = dayAvailabilities[dateStr]
    if (!avail || avail === 'none') return isPast ? 'text-stone-300 bg-stone-50' : 'text-stone-300'
    if (avail === 'high') return 'text-emerald-600 bg-emerald-50'
    if (avail === 'medium') return 'text-amber-600 bg-amber-50'
    return 'text-red-500 bg-red-50'
  }

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
  const dayNames = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

  // ==================== VALIDATION ====================

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!booking.customer.customerName.trim()) errors.customerName = 'Nome obbligatorio'
    if (!booking.customer.customerSurname.trim()) errors.customerSurname = 'Cognome obbligatorio'
    if (!booking.customer.customerPhone.trim()) errors.customerPhone = 'Telefono obbligatorio'
    else if (!/^[+]?[\d\s()-]{8,}$/.test(booking.customer.customerPhone)) errors.customerPhone = 'Telefono non valido'
    if (booking.customer.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.customer.customerEmail)) {
      errors.customerEmail = 'Email non valida'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ==================== SUBMIT ====================

  const handleSubmit = async () => {
    if (!validateForm()) return
    setSubmitting(true)
    setError('')

    try {
      // Re-verify slot availability
      const slotRes = await fetch(`/api/slots?date=${booking.date}&duration=${totalDuration}`)
      const slotData = await slotRes.json()
      if (!slotData.slots || !slotData.slots.includes(booking.time)) {
        setError('Lo slot selezionato non e piu disponibile. Seleziona un altro orario.')
        setSubmitting(false)
        return
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore nella prenotazione')
      }

      setStep(4)

      // Save or clear localStorage based on rememberMe
      if (rememberMe) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            customerName: booking.customer.customerName,
            customerSurname: booking.customer.customerSurname,
            customerPhone: booking.customer.customerPhone,
          }))
        } catch {}
      } else {
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella prenotazione')
    } finally {
      setSubmitting(false)
    }
  }

  const canGoNext = () => {
    if (step === 1) return booking.serviceIds.length > 0
    if (step === 2) return booking.date && booking.time
    return true
  }

  const goNext = () => {
    if (step === 3) {
      handleSubmit()
    } else {
      setStep(prev => prev + 1)
    }
  }

  // ==================== HELPERS ====================

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  // ==================== RENDER ====================

  const stepLabels = [
    { num: 1, label: 'Servizi', icon: <Calendar className="w-4 h-4" /> },
    { num: 2, label: 'Data e Ora', icon: <Clock className="w-4 h-4" /> },
    { num: 3, label: 'Cliente', icon: <User className="w-4 h-4" /> },
  ]

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" /></div>)
  }

  // Step 4: Success
  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6, bounce: 0.5 }}
            className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"
          >
            <PartyPopper className="w-8 h-8 text-emerald-600" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">Prenotazione creata!</h2>
            <p className="text-stone-500 text-sm mb-6">La prenotazione e stata inserita con successo.</p>

            <div className="text-left max-w-sm mx-auto p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Data</span>
                <span className="font-medium">{formatDisplayDate(booking.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Ora</span>
                <span className="font-medium">{booking.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cliente</span>
                <span className="font-medium">{booking.customer.customerName} {booking.customer.customerSurname}</span>
              </div>
              <div className="border-t border-stone-200 pt-2 space-y-1">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between">
                    <span className="text-stone-600">{s.name}</span>
                    <span className="font-medium">EUR {s.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-1 border-t border-stone-200">
                  <span>Totale</span>
                  <span>EUR {totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-center">
              <button
                onClick={() => { setStep(1); setBooking({ serviceIds: [], date: '', time: '', customer: { customerName: '', customerSurname: '', customerPhone: '', customerEmail: '' } }); setFormErrors({}) }}
                className="px-6 py-3 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Nuova Prenotazione
              </button>
              <button
                onClick={() => router.push('/admin/calendario')}
                className="px-6 py-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Vai al Calendario
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Nuova Prenotazione</h1>
          <p className="text-stone-500 text-sm mt-1">Inserisci una prenotazione manualmente</p>
        </div>
        <button
          onClick={() => router.push('/admin/calendario')}
          className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          Torna al calendario
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2 mb-6">
        {stepLabels.map(s => (
          <div key={s.num} className="flex-1 flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              step >= s.num ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'
            }`}>
              {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
            </div>
            <span className={`text-xs font-medium hidden sm:flex ${step >= s.num ? 'text-stone-900' : 'text-stone-400'}`}>
              {s.label}
            </span>
            {s.num < 3 && <div className={`flex-1 h-0.5 ${step > s.num ? 'bg-stone-900' : 'bg-stone-200'}`} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* ==================== STEP 1: SERVICES ==================== */}
          {step === 1 && (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Scegli i servizi</h2>
              <p className="text-stone-500 text-sm mb-4">Seleziona uno o piu servizi per l&apos;appuntamento</p>

              <div className="space-y-3">
                {services.filter(s => s.active).map(service => {
                  const isSelected = booking.serviceIds.includes(service.id)
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <span className="font-medium text-stone-900">{service.name}</span>
                            {service.description && <p className="text-stone-500 text-xs mt-0.5">{service.description}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="font-semibold text-stone-900">EUR {service.price.toFixed(2)}</div>
                          <div className="text-stone-400 text-xs flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />{service.durationMinutes} min
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {booking.serviceIds.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-stone-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-stone-400 text-sm">Selezionati</span>
                    <div className="font-semibold">
                      {booking.serviceIds.length} servizio{booking.serviceIds.length > 1 ? 'i' : ''} &middot; {formatDuration(totalDuration)}
                    </div>
                    {totalCleanupInList > 0 && (
                      <div className="text-stone-400 text-xs mt-0.5">incl. {totalCleanupInList} min di pulizia/organizzazione</div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-stone-400 text-sm">Totale</span>
                    <div className="font-semibold">EUR {totalPrice.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== STEP 2: CALENDAR ==================== */}
          {step === 2 && (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Scegli data e ora</h2>
              <p className="text-stone-500 text-sm mb-4">
                Durata: {formatDuration(totalDuration)} &middot; EUR {totalPrice.toFixed(2)}
              </p>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-4 text-xs text-stone-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Disponibile</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> Pochi posti</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Completo</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300 border border-red-400" /> Chiuso</div>
              </div>

              {/* Calendar */}
              <div className="rounded-xl border border-stone-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-stone-600" />
                  </button>
                  <span className="font-semibold text-stone-900">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                  <button onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                    <ChevronRight className="w-5 h-5 text-stone-600" />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map(d => (<div key={d} className="text-center text-xs font-medium text-stone-400 py-1">{d}</div>))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays().map((day, i) => {
                    const avail = dayAvailabilities[day.dateStr]
                    const isDisabled = day.date === 0 || isDayClosed(day.dateStr) || (avail === 'none')
                    return (
                      <button
                        key={i}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && fetchSlotsForDate(day.dateStr)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                          day.date === 0 ? '' :
                          booking.date === day.dateStr ? 'bg-stone-900 text-white font-semibold' :
                          getDayColor(day.dateStr, day.isPast)
                        } ${!isDisabled ? 'hover:bg-stone-200 cursor-pointer' : ''}`}
                      >
                        {day.date > 0 ? (
                          <>
                            {day.date}
                            {isDayClosed(day.dateStr) && <CalendarX className="w-3 h-3 mt-0.5" />}
                          </>
                        ) : ''}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time slots */}
              {booking.date && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <h3 className="text-sm font-medium text-stone-700 mb-3">
                    {loadingSlots ? 'Caricamento orari...' : `Orari disponibili per ${formatDisplayDate(booking.date)}`}
                  </h3>
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-stone-400">
                      <div className="animate-spin w-4 h-4 border-2 border-stone-300 border-t-stone-900 rounded-full" />
                      Caricamento...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-stone-400 text-sm">Nessun orario disponibile per questa data</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setBooking(prev => ({ ...prev, time: slot }))}
                          className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                            booking.time === slot ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* ==================== STEP 3: CUSTOMER INFO ==================== */}
          {step === 3 && (
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Dati cliente</h2>
              <p className="text-stone-500 text-sm mb-4">Inserisci i dati del cliente per la prenotazione</p>

              {/* Summary */}
              <div className="mb-6 p-4 rounded-xl bg-stone-50 border border-stone-100">
                <div className="text-sm font-medium text-stone-700 mb-2">Riepilogo</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Data</span>
                    <span className="font-medium">{formatDisplayDate(booking.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ora</span>
                    <span className="font-medium">{booking.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Durata</span>
                    <span className="font-medium">{formatDuration(totalServiceDuration)}{totalCleanupInList > 0 ? ` + ${totalCleanupInList} min pulizia` : ''}</span>
                  </div>
                  <div className="border-t border-stone-200 pt-1 mt-1">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex justify-between">
                        <span className="text-stone-600">{s.name}</span>
                        <span className="font-medium">EUR {s.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-stone-200 pt-1 mt-1 flex justify-between">
                    <span className="font-semibold text-stone-900">Totale</span>
                    <span className="font-semibold text-stone-900">EUR {totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Nome *</label>
                    <input
                      type="text"
                      value={booking.customer.customerName}
                      onChange={e => { setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerName: e.target.value } })); if (formErrors.customerName) setFormErrors(prev => ({ ...prev, customerName: '' })) }}
                      placeholder="Mario"
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${formErrors.customerName ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'}`}
                    />
                    {formErrors.customerName && <p className="text-red-500 text-xs mt-1">{formErrors.customerName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Cognome *</label>
                    <input
                      type="text"
                      value={booking.customer.customerSurname}
                      onChange={e => { setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerSurname: e.target.value } })); if (formErrors.customerSurname) setFormErrors(prev => ({ ...prev, customerSurname: '' })) }}
                      placeholder="Rossi"
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${formErrors.customerSurname ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'}`}
                    />
                    {formErrors.customerSurname && <p className="text-red-500 text-xs mt-1">{formErrors.customerSurname}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Telefono *</label>
                    <input
                      type="tel"
                      value={booking.customer.customerPhone}
                      onChange={e => { setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerPhone: e.target.value } })); if (formErrors.customerPhone) setFormErrors(prev => ({ ...prev, customerPhone: '' })) }}
                      placeholder="+39 333 1234567"
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${formErrors.customerPhone ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'}`}
                    />
                    {formErrors.customerPhone && <p className="text-red-500 text-xs mt-1">{formErrors.customerPhone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Email <span className="text-stone-400 font-normal">(opzionale)</span></label>
                    <input
                      type="email"
                      value={booking.customer.customerEmail}
                      onChange={e => { setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerEmail: e.target.value } })); if (formErrors.customerEmail) setFormErrors(prev => ({ ...prev, customerEmail: '' })) }}
                      placeholder="mario@email.com"
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${formErrors.customerEmail ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'}`}
                    />
                    {formErrors.customerEmail && <p className="text-red-500 text-xs mt-1">{formErrors.customerEmail}</p>}
                  </div>
                </div>

                {/* Ricordami checkbox */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <span className="text-sm text-stone-600">Ricordami per la prossima prenotazione</span>
                </label>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {step < 4 && (
        <div className="mt-6 flex items-center justify-between sm:sticky sm:bottom-4">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(prev => prev - 1)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Indietro
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <span className="text-red-500 text-sm">{error}</span>
            )}

            {step >= 2 && booking.serviceIds.length > 0 && (
              <span className="hidden sm:inline text-xs text-stone-500">
                {booking.serviceIds.length} servizio{booking.serviceIds.length > 1 ? 'i' : ''} &middot; {formatDuration(totalDuration)} &middot; EUR {totalPrice.toFixed(2)}
              </span>
            )}

            <button
              onClick={goNext}
              disabled={!canGoNext() || submitting}
              className="px-4 sm:px-6 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium flex items-center gap-2 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <><div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Salvataggio...</>
              ) : step === 3 ? (
                <><span className="hidden sm:inline">Conferma Prenotazione</span><span className="sm:hidden">Conferma</span></>
              ) : (
                <>Continua <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
