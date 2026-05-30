'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { createInRome } from '@/lib/timezone'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Calendar,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  CalendarX,
  Download,
  X,
  ExternalLink,
  LogIn,
  Mail,
  ShieldCheck,
} from 'lucide-react'

// ==================== TYPES ====================

interface Service {
  id: string
  name: string
  description?: string
  price: number
  durationMinutes: number
  cleanupMinutes: number
  bufferMinutes: number
  active: boolean
}

interface ResourceOption {
  id: string
  name: string
}

interface BookingData {
  serviceIds: string[]
  resourceId?: string | null
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

interface DayAvailability {
  date: string
  availability: AvailabilityLevel
}

interface CustomerAuthData {
  id: string
  nome: string
  telefono: string
  email: string
}

// ==================== MAIN COMPONENT ====================

export default function PrenotaPage() {
  const router = useRouter()
  const { canInstall: canInstallPWA, isIOS: isIOSSafari, promptInstall: promptPWAInstall, dismiss: dismissPWAInstall } = usePWAInstall()
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [step, setStep] = useState(1)
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null)
  const [shopName, setShopName] = useState<string>('')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Operator / Resource selection state
  const [availableResources, setAvailableResources] = useState<ResourceOption[]>([])
  const [loadingResources, setLoadingResources] = useState(false)

  const [booking, setBooking] = useState<BookingData>({
    serviceIds: [],
    resourceId: null,
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
  const STORAGE_KEY = 'booking_remember'

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [dayAvailabilities, setDayAvailabilities] = useState<Record<string, AvailabilityLevel>>({})
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [closedDates, setClosedDates] = useState<string[]>([])

  // Customer authentication state (optional OTP login)
  const [customerAuth, setCustomerAuth] = useState<CustomerAuthData | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')

  // Utility: split a full name into firstName / lastName.
  // Handles single-word names gracefully (e.g. "Amir" → firstName="Amir", lastName="").
  // Handles multi-word names (e.g. "Mario Rossi" → firstName="Mario", lastName="Rossi").
  const splitNome = (nome: string | undefined | null): { firstName: string; lastName: string } => {
    if (!nome || !nome.trim()) return { firstName: '', lastName: '' }
    const parts = nome.trim().split(/\s+/)
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
  }

  // Derive whether the logged-in user has a complete profile that will pass
  // BOTH the Zod server-side validation AND the UI logic.
  // Requirements: firstName >= 2 chars, lastName >= 2 chars, phone >= 8 digits (no temp).
  // Single-word names (e.g. "Amir") are NOT considered complete because Zod requires customerSurname.
  const hasCompleteProfile = !!(
    customerAuth &&
    (() => {
      const { firstName, lastName } = splitNome(customerAuth.nome)
      return (
        firstName.length >= 2 &&
        lastName.length >= 2 &&
        customerAuth.telefono &&
        !customerAuth.telefono.startsWith('temp_') &&
        customerAuth.telefono.replace(/\s/g, '').length >= 8
      )
    })()
  )

  // Check if customer is already logged in on mount
  useEffect(() => {
    fetch('/api/auth/customer/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.customer) {
          setCustomerAuth(data.customer)
          // Pre-fill form fields with saved customer data
          const { firstName, lastName } = splitNome(data.customer.nome)
          const phone = data.customer.telefono?.startsWith('temp_') ? '' : (data.customer.telefono || '')
          const email = data.customer.email || ''
          setBooking(prev => ({
            ...prev,
            customer: {
              ...prev.customer,
              customerName: firstName,
              customerSurname: lastName,
              customerPhone: phone,
              customerEmail: email,
            },
          }))
        }
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
  }, [])

  // Keep form fields in sync whenever customerAuth changes (e.g. after OTP login mid-flow)
  useEffect(() => {
    if (!customerAuth) return
    const { firstName, lastName } = splitNome(customerAuth.nome)
    const phone = customerAuth.telefono?.startsWith('temp_') ? '' : (customerAuth.telefono || '')
    const email = customerAuth.email || ''
    setBooking(prev => {
      // Only update if the new values are non-empty (don't overwrite user edits with blanks)
      if (
        prev.customer.customerName === firstName &&
        prev.customer.customerSurname === lastName &&
        prev.customer.customerPhone === phone &&
        prev.customer.customerEmail === email
      ) return prev
      return {
        ...prev,
        customer: {
          customerName: firstName || prev.customer.customerName,
          customerSurname: lastName || prev.customer.customerSurname,
          customerPhone: phone || prev.customer.customerPhone,
          customerEmail: email || prev.customer.customerEmail,
        },
      }
    })
  }, [customerAuth])

  // Load remembered customer data on mount (only if not already logged in)
  useEffect(() => {
    if (customerAuth) return // Don't overwrite with localStorage if logged in
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
  }, [customerAuth])

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

  // Fetch resources when entering step 2 (operator selection)
  // Filtered by the services selected in step 1
  useEffect(() => {
    if (step === 2 && booking.serviceIds.length > 0) {
      setLoadingResources(true)
      const serviceIdsParam = booking.serviceIds.join(',')
      fetch(`/api/resources/public?serviceIds=${serviceIdsParam}`)
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data as ResourceOption[] : []
          setAvailableResources(list)
          setLoadingResources(false)
          // If there are no resources at all, auto-skip to calendar (step 3)
          if (list.length === 0) {
            setStep(3)
          }
        })
        .catch(() => {
          setAvailableResources([])
          setLoadingResources(false)
        })
    }
  }, [step, booking.serviceIds])

  // Fetch closed dates and closed periods when entering step 3 (calendar)
  useEffect(() => {
    if (step === 3) {
      // Fetch single closed dates
      const closedDatesPromise = fetch('/api/closed-dates')
        .then(r => r.json())
        .then(data => Array.isArray(data) ? data.map((d: { date: string }) => d.date) : [] as string[])
        .catch(() => [] as string[])

      // Fetch closed periods (vacations etc.) and expand to individual dates
      const closedPeriodsPromise = fetch('/api/closed-periods')
        .then(r => r.json())
        .then((periods: Array<{ startDate: string; endDate: string }>) => {
          if (!Array.isArray(periods)) return [] as string[]
          const dates: string[] = []
          for (const p of periods) {
            let cur = new Date(p.startDate + 'T00:00:00')
            const end = new Date(p.endDate + 'T00:00:00')
            while (cur <= end) {
              dates.push(cur.toISOString().split('T')[0])
              cur.setDate(cur.getDate() + 1)
            }
          }
          return dates
        })
        .catch(() => [] as string[])

      Promise.all([closedDatesPromise, closedPeriodsPromise]).then(([singleDates, periodDates]) => {
        setClosedDates([...new Set([...singleDates, ...periodDates])])
      })
    }
  }, [step])

  const isDayClosed = (dateStr: string) => closedDates.includes(dateStr)

  const totalServiceDuration = booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + (s?.durationMinutes || 0)
  }, 0)
  const totalCleanupDuration = booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + ((s as Service)?.cleanupMinutes || 0)
  }, 0)
  const totalBufferDuration = booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + ((s as Service)?.bufferMinutes || 0)
  }, 0)
  // Duration shown to customer (service + cleanup)
  const totalDuration = totalServiceDuration + totalCleanupDuration
  // Duration used for slot calculation (includes invisible buffer)
  const totalSlotDuration = totalDuration + totalBufferDuration

  const totalPrice = booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + (s?.price || 0)
  }, 0)

  const selectedServices = booking.serviceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[]

  const totalCleanupInList = selectedServices.reduce((sum, s) => sum + (s.cleanupMinutes || 0), 0)

  // Name of the selected operator (for summaries)
  const selectedOperatorName = booking.resourceId
    ? availableResources.find(r => r.id === booking.resourceId)?.name || ''
    : ''

  // Toggle service selection — also resets resourceId and date/time since operator availability depends on services
  const toggleService = (id: string) => {
    setBooking(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter(sid => sid !== id)
        : [...prev.serviceIds, id],
      resourceId: null,
      date: '',
      time: '',
    }))
  }

  // ==================== STEP 1: SERVICES ====================

  const StepServices = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-1">Scegli i servizi</h2>
        <p className="text-stone-500 text-sm">Seleziona uno o piu servizi per il tuo appuntamento</p>
      </div>

      <div className="space-y-3">
        {services.map(service => {
          const isSelected = booking.serviceIds.includes(service.id)
          return (
            <motion.button
              key={service.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleService(service.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-stone-900 bg-stone-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-stone-900 border-stone-900' : 'border-stone-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-medium text-stone-900">{service.name}</span>
                  </div>
                  {service.description && (
                    <p className="text-stone-500 text-sm mt-1 ml-8">{service.description}</p>
                  )}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <div className="font-semibold text-stone-900">€{service.price.toFixed(2)}</div>
                  <div className="text-stone-400 text-xs flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {service.durationMinutes} min
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Selection summary */}
      {booking.serviceIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-stone-900 text-white flex items-center justify-between"
        >
          <div>
            <span className="text-stone-400 text-sm">Servizi selezionati</span>
            <div className="font-semibold">
              {booking.serviceIds.length} servizio{booking.serviceIds.length > 1 ? 'i' : ''} · {formatDuration(totalDuration)}
            </div>
            {totalCleanupInList > 0 && (
              <div className="text-stone-400 text-xs mt-0.5">incl. {totalCleanupInList} min di pulizia/organizzazione</div>
            )}
          </div>
          <div className="text-right">
            <span className="text-stone-400 text-sm">Totale</span>
            <div className="font-semibold">€{totalPrice.toFixed(2)}</div>
          </div>
        </motion.div>
      )}
    </div>
  )

  // ==================== STEP 2: OPERATOR SELECTION ====================

  const selectOperator = (resourceId: string | null) => {
    setBooking(prev => ({
      ...prev,
      resourceId,
      date: '',
      time: '',
    }))
  }

  const StepOperator = () => {
    if (loadingResources) {
      return (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-stone-900 mb-1">Scegli un operatore</h2>
            <p className="text-stone-500 text-sm">Caricamento operatori disponibili...</p>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-stone-200 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-stone-900 mb-1">Scegli un operatore</h2>
          <p className="text-stone-500 text-sm">Seleziona chi ti assistera, oppure scegli il primo disponibile</p>
        </div>

        <div className="space-y-3">
          {/* "Any operator" default option */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => selectOperator(null)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              !booking.resourceId
                ? 'border-stone-900 bg-stone-50'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  !booking.resourceId ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-stone-900">Qualsiasi operatore disponibile</div>
                <div className="text-stone-500 text-xs mt-0.5">Verra assegnato il primo operatore libero</div>
              </div>
              {!booking.resourceId && <Check className="w-5 h-5 text-stone-900 shrink-0" />}
            </div>
          </motion.button>

          {/* Individual operators */}
          {availableResources.map(resource => {
            const isSelected = booking.resourceId === resource.id
            return (
              <motion.button
                key={resource.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectOperator(resource.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isSelected ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {resource.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-stone-900">{resource.name}</div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-stone-900 shrink-0" />}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Selected operator summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-100 text-sm text-stone-500 text-center"
        >
          {booking.resourceId
            ? `Verrai affidato a ${selectedOperatorName}`
            : `Assegnazione automatica al primo operatore disponibile`
          }
        </motion.div>
      </div>
    )
  }

  // ==================== STEP 3: CALENDAR ====================

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchMonthAvailability = useCallback(async (year: number, month: number) => {
    if (totalSlotDuration === 0) return
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const from = formatDate(firstDay)
    const to = formatDate(lastDay)

    try {
      // OPTIMIZED: Single batch API call instead of 30 individual calls
      // Pass resourceId if an operator was selected, to scope availability to that operator only
      const resourceIdParam = booking.resourceId ? `&resourceId=${booking.resourceId}` : ''
      const res = await fetch(`/api/slots/batch?startDate=${from}&endDate=${to}&duration=${totalSlotDuration}${resourceIdParam}`)
      if (!res.ok) {
        console.error('Batch availability API returned', res.status)
        return
      }
      const data = await res.json()

      if (typeof data === 'object' && data !== null && !('error' in data)) {
        setDayAvailabilities(data as Record<string, AvailabilityLevel>)
      }
    } catch (e) {
      console.error('Error fetching availability:', e)
    }
  }, [totalSlotDuration, booking.resourceId])

  useEffect(() => {
    if (step === 3) {
      fetchMonthAvailability(calendarMonth.getFullYear(), calendarMonth.getMonth())
    }
  }, [step, calendarMonth, fetchMonthAvailability])

  const fetchSlotsForDate = async (dateStr: string) => {
    setLoadingSlots(true)
    setBooking(prev => ({ ...prev, date: dateStr, time: '' }))
    try {
      // Pass resourceId if an operator was selected
      const resourceIdParam = booking.resourceId ? `&resourceId=${booking.resourceId}` : ''
      const res = await fetch(`/api/slots?date=${dateStr}&duration=${totalSlotDuration}${resourceIdParam}`)
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
    const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Monday start

    const days: { date: number; dateStr: string; isPast: boolean; isToday: boolean }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < startOffset; i++) {
      days.push({ date: 0, dateStr: '', isPast: true, isToday: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dateObj = new Date(year, month, d)
      days.push({
        date: d,
        dateStr,
        isPast: dateObj < today,
        isToday: dateObj.getTime() === today.getTime(),
      })
    }
    return days
  }

  const getDayColor = (dateStr: string, isPast: boolean) => {
    if (isPast) return 'text-stone-300'
    if (isDayClosed(dateStr)) return 'text-red-500 bg-red-50'
    const avail = dayAvailabilities[dateStr]
    if (!avail || avail === 'none') return 'text-stone-300'
    if (avail === 'high' || avail === 'medium') return 'text-emerald-600 bg-emerald-50'
    // 'low' = pochi posti ma ancora disponibili -> giallo (NON rosso)
    return 'text-amber-600 bg-amber-50'
  }

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
  const dayNames = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

  const StepCalendar = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-1">Scegli data e ora</h2>
        <p className="text-stone-500 text-sm">
          Durata totale: {formatDuration(totalDuration)} · {totalPrice.toFixed(2)}€
          {booking.resourceId && (
            <span className="ml-1">· {selectedOperatorName}</span>
          )}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-stone-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Disponibile</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> Pochi posti</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Completo</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300 border border-red-400" /> Chiuso</div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-stone-600" />
          </button>
          <span className="font-semibold text-stone-900">
            {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
          </span>
          <button
            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-stone-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays().map((day, i) => (
            <button
              key={i}
              disabled={day.isPast || isDayClosed(day.dateStr) || (dayAvailabilities[day.dateStr] === 'none' && !day.isPast && day.date > 0)}
              onClick={() => day.date > 0 && !day.isPast && !isDayClosed(day.dateStr) && fetchSlotsForDate(day.dateStr)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                day.date === 0
                  ? ''
                  : booking.date === day.dateStr
                  ? 'bg-stone-900 text-white font-semibold'
                  : getDayColor(day.dateStr, day.isPast)
              } ${day.date > 0 && !day.isPast && !isDayClosed(day.dateStr) ? 'hover:bg-stone-200 cursor-pointer' : ''}`}
            >
              {day.date > 0 ? (
                <>
                  {day.date}
                  {isDayClosed(day.dateStr) && <CalendarX className="w-3 h-3 mt-0.5" />}
                </>
              ) : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Time slots */}
      {booking.date && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <h3 className="text-sm font-medium text-stone-700 mb-3">
            {loadingSlots ? 'Caricamento orari...' : `Orari disponibili per ${formatDisplayDate(booking.date)}`}
          </h3>

          {loadingSlots ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="py-3 rounded-xl bg-stone-200 animate-pulse"
                  style={{ animationDelay: `${i * 75}ms` }}
                />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-stone-400 text-sm">Nessun orario disponibile per questa data</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map(slot => (
                <motion.button
                  key={slot}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setBooking(prev => ({ ...prev, time: slot }))}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    booking.time === slot
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {slot}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )

  // ==================== OTP LOGIN FLOW ====================

  const handleRequestOtp = async () => {
    if (!loginEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setOtpError('Inserisci un indirizzo email valido')
      return
    }
    setOtpError('')
    setOtpSending(true)
    try {
      const res = await fetch('/api/auth/customer/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore nell\'invio del codice')
      }
      setOtpSent(true)
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      setOtpError('Inserisci il codice a 6 cifre')
      return
    }
    setOtpError('')
    setOtpVerifying(true)
    try {
      const res = await fetch('/api/auth/customer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, otpCode }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Codice non valido')
      }
      const data = await res.json()
      // Set auth state and pre-fill form
      setCustomerAuth(data.customer)
      setShowLoginModal(false)
      setOtpSent(false)
      setOtpCode('')
      // Pre-fill form with customer data — useEffect above will also sync this
      if (data.customer) {
        const { firstName, lastName } = splitNome(data.customer.nome)
        const phone = data.customer.telefono?.startsWith('temp_') ? '' : (data.customer.telefono || '')
        const email = data.customer.email || ''
        setBooking(prev => ({
          ...prev,
          customer: {
            customerName: firstName || prev.customer.customerName,
            customerSurname: lastName || prev.customer.customerSurname,
            customerPhone: phone || prev.customer.customerPhone,
            customerEmail: email || prev.customer.customerEmail,
          },
        }))
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setOtpVerifying(false)
    }
  }

  const closeLoginModal = () => {
    setShowLoginModal(false)
    setOtpSent(false)
    setOtpCode('')
    setOtpError('')
    setLoginEmail('')
  }

  const LoginBanner = () => {
    // Logged in but INCOMPLETE profile — prompt to fill in the missing fields
    if (customerAuth && !hasCompleteProfile) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 truncate">
              Account connesso{customerAuth.email ? ` — ${customerAuth.email}` : ''}
            </p>
            <p className="text-xs text-blue-600">Completa i dati qui sotto per confermare la prenotazione.</p>
          </div>
        </motion.div>
      )
    }

    // Not logged in — show login prompt
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <LogIn className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">Hai un account? Accedi per gestire le tue prenotazioni</p>
            <p className="text-xs text-amber-600">Accedi con un codice temporaneo via email per visualizzare lo storico.</p>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-200 transition-colors shrink-0"
          >
            Accedi
          </button>
        </motion.div>

        {/* Login Modal (inline overlay) */}
        <AnimatePresence>
          {showLoginModal && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40"
                onClick={closeLoginModal}
              />
              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-stone-900">Accedi al tuo account</h3>
                  <button onClick={closeLoginModal} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>

                <p className="text-sm text-stone-500 mb-4">
                  Inserisci la tua email per ricevere un codice di accesso temporaneo a 6 cifre.
                </p>

                {/* Email input */}
                {!otpSent && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={e => { setLoginEmail(e.target.value); setOtpError('') }}
                          placeholder="La tua email"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-sm"
                          onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                        />
                      </div>
                      <button
                        onClick={handleRequestOtp}
                        disabled={otpSending || !loginEmail.trim()}
                        className="px-5 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        {otpSending ? 'Invio...' : 'Invia Codice'}
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP input */}
                {otpSent && (
                  <div className="space-y-3">
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      Codice inviato a <strong>{loginEmail}</strong>
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                        placeholder="000000"
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-center text-xl font-bold tracking-[0.15em]"
                        onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                        autoFocus
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpVerifying || otpCode.length !== 6}
                        className="px-5 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                      >
                        {otpVerifying ? 'Verifica...' : 'Verifica'}
                      </button>
                    </div>
                    <button
                      onClick={() => { setOtpSent(false); setOtpCode(''); setOtpError('') }}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      Non ho ricevuto il codice — invia di nuovo
                    </button>
                    <p className="text-xs text-stone-400 mt-2">
                      Non hai ancora un account?{' '}
                      <Link href="/register" className="text-stone-900 font-medium hover:underline" onClick={() => setShowLoginModal(false)}>
                        Registrati qui
                      </Link>
                    </p>
                  </div>
                )}

                {/* Error message */}
                {otpError && (
                  <p className="text-sm text-red-500 mt-2">{otpError}</p>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  // ==================== STEP 4: CUSTOMER INFO ====================

  const validateForm = () => {
    // If logged in with a COMPLETE profile (verified by hasCompleteProfile),
    // the form is hidden — data comes directly from customerAuth in handleSubmit.
    if (hasCompleteProfile) return true

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

  // Reusable booking summary block (shared by logged-in and guest views)
  const BookingSummaryBlock = () => (
    <div className="mb-6 p-4 rounded-xl bg-stone-50 border border-stone-100">
      <div className="text-sm font-medium text-stone-700 mb-2">Riepilogo</div>
      <div className="space-y-1 text-sm">
        {booking.resourceId && (
          <div className="flex justify-between">
            <span className="text-stone-500">Operatore</span>
            <span className="font-medium">{selectedOperatorName}</span>
          </div>
        )}
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
              <span className="font-medium">€{s.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-200 pt-1 mt-1 flex justify-between">
          <span className="font-semibold text-stone-900">Totale</span>
          <span className="font-semibold text-stone-900">€{totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )

  const StepCustomerInfo = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-1">I tuoi dati</h2>
        <p className="text-stone-500 text-sm">
          {hasCompleteProfile ? 'Conferma la tua prenotazione' : 'Inserisci i tuoi dati per confermare la prenotazione'}
        </p>
      </div>

      {hasCompleteProfile ? (
        /* ===== LOGGED-IN + COMPLETE PROFILE: elegant summary, no form ===== */
        <>
          {/* Welcome & profile data box */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-stone-50 rounded-2xl p-6 border border-stone-100"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-white">
                  {customerAuth.nome?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-stone-900">
                  Bentornato, {customerAuth.nome?.split(' ')[0] || 'Cliente'}!
                </p>
                <p className="text-sm text-stone-500">
                  Convalidiamo la tua prenotazione utilizzando i dati del tuo profilo.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <User className="w-4 h-4 text-stone-400" />
                <span>{customerAuth.nome}</span>
              </div>
              {customerAuth.telefono && !customerAuth.telefono.startsWith('temp_') && (
                <div className="flex items-center gap-2 text-stone-600">
                  <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span>{customerAuth.telefono}</span>
                </div>
              )}
              {customerAuth.email && (
                <div className="flex items-center gap-2 text-stone-600">
                  <Mail className="w-4 h-4 text-stone-400" />
                  <span>{customerAuth.email}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Booking summary */}
          <BookingSummaryBlock />
        </>
      ) : (
        /* ===== GUEST or INCOMPLETE PROFILE: form + banner ===== */
        <>
          {/* Login banner (amber for guests, or blue info for logged-in with incomplete profile) */}
          <LoginBanner />

          {/* Register link — only for guests (not when logged in) */}
          {!customerAuth && (
            <p className="text-xs text-stone-400 text-center mb-5">
              Non hai ancora un account?{' '}
              <Link href="/register" className="text-stone-900 font-medium hover:underline">
                Registrati qui
              </Link>
            </p>
          )}

          {/* Booking summary */}
          <BookingSummaryBlock />

          {/* Guest form */}
          <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Nome *</label>
          <input
            type="text"
            value={booking.customer.customerName}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerName: e.target.value } }))
              if (formErrors.customerName) setFormErrors(prev => ({ ...prev, customerName: '' }))
            }}
            placeholder="Mario"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
              formErrors.customerName ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
            }`}
          />
          {formErrors.customerName && <p className="text-red-500 text-xs mt-1">{formErrors.customerName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Cognome *</label>
          <input
            type="text"
            value={booking.customer.customerSurname}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerSurname: e.target.value } }))
              if (formErrors.customerSurname) setFormErrors(prev => ({ ...prev, customerSurname: '' }))
            }}
            placeholder="Rossi"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
              formErrors.customerSurname ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
            }`}
          />
          {formErrors.customerSurname && <p className="text-red-500 text-xs mt-1">{formErrors.customerSurname}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Telefono *</label>
          <input
            type="tel"
            value={booking.customer.customerPhone}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerPhone: e.target.value } }))
              if (formErrors.customerPhone) setFormErrors(prev => ({ ...prev, customerPhone: '' }))
            }}
            placeholder="+39 333 1234567"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
              formErrors.customerPhone ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
            }`}
          />
          {formErrors.customerPhone && <p className="text-red-500 text-xs mt-1">{formErrors.customerPhone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Email <span className="text-stone-400 font-normal">(opzionale)</span>
          </label>
          <input
            type="email"
            value={booking.customer.customerEmail}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerEmail: e.target.value } }))
              if (formErrors.customerEmail) setFormErrors(prev => ({ ...prev, customerEmail: '' }))
            }}
            placeholder="mario@email.com"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-stone-900 placeholder-stone-400 outline-none transition-colors ${
              formErrors.customerEmail ? 'border-red-400' : 'border-stone-200 focus:border-stone-900'
            }`}
          />
          {formErrors.customerEmail && <p className="text-red-500 text-xs mt-1">{formErrors.customerEmail}</p>}
        </div>

        {/* Ricordami checkbox — only for guests */}
        {!customerAuth && (
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            />
            <span className="text-sm text-stone-600">Ricordami per la prossima prenotazione</span>
          </label>
        )}
          </div>
        </>
      )}
    </div>
  )

  // ==================== STEP 5: CONFIRMATION ====================

  const StepConfirmation = () => (
    <div className="text-center py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.5 }}
        className="mx-auto mb-6 w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
      >
        <PartyPopper className="w-10 h-10 text-emerald-600" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-semibold text-stone-900 mb-2">Prenotazione confermata!</h2>
        <p className="text-stone-500 mb-8">Grazie, ti aspettiamo!</p>

        <div className="text-left max-w-sm mx-auto p-5 rounded-xl bg-stone-50 border border-stone-100 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Data</span>
            <span className="font-medium">{formatDisplayDate(booking.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Ora</span>
            <span className="font-medium">{booking.time}</span>
          </div>
          {booking.resourceId && (
            <div className="flex justify-between">
              <span className="text-stone-500">Operatore</span>
              <span className="font-medium">{selectedOperatorName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-stone-500">Cliente</span>
            <span className="font-medium">{booking.customer.customerName} {booking.customer.customerSurname}</span>
          </div>
          <div className="border-t border-stone-200 pt-2 space-y-1">
            {selectedServices.map(s => (
              <div key={s.id} className="flex justify-between">
                <span className="text-stone-600">{s.name}</span>
                <span className="font-medium">€{s.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-1 border-t border-stone-200">
              <span>Totale</span>
              <span>€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Google Calendar + Cancel Link */}
        <div className="mt-6 mx-auto max-w-sm space-y-3 print:hidden">
          {/* Google Calendar Link */}
          <a
            href={buildGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Aggiungi al Calendario
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </a>

          {/* Cancellation Link */}
          {confirmedBookingId && (
            <a
              href={`/prenota/cancella/${confirmedBookingId}`}
              className="block w-full text-center px-4 py-2.5 rounded-xl text-stone-400 text-xs hover:text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Annulla questa prenotazione
            </a>
          )}
        </div>

        <button
          onClick={() => router.push('/')}
          className="mt-6 px-8 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors print:hidden"
        >
          Torna alla Home
        </button>

        {/* PWA Install Prompt */}
        {canInstallPWA && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-5 mx-auto max-w-sm relative"
          >
            {isIOSSafari && !showIOSHint ? (
              <button
                onClick={() => setShowIOSHint(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Scarica l&apos;app sul tuo telefono
              </button>
            ) : isIOSSafari && showIOSHint ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Installa IntelliGenda</span>
                  <button onClick={dismissPWAInstall} className="p-1 rounded-md hover:bg-blue-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ol className="space-y-1 list-decimal list-inside text-blue-700">
                  <li>Tocca il pulsante <strong>Condividi</strong> in basso</li>
                  <li>Seleziona <strong>Aggiungi a Home</strong></li>
                  <li>Conferma con <strong>Aggiungi</strong></li>
                </ol>
              </div>
            ) : (
              <button
                onClick={promptPWAInstall}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Scarica l&apos;app per le prossime prenotazioni
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )

  // ==================== SUBMIT ====================

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    setError('')

    try {
      // Re-verify slot availability before submitting
      // Pass resourceId if an operator was selected
      const resourceIdParam = booking.resourceId ? `&resourceId=${booking.resourceId}` : ''
      const slotRes = await fetch(`/api/slots?date=${booking.date}&duration=${totalSlotDuration}${resourceIdParam}`)
      const slotData = await slotRes.json()
      if (!slotData.slots || !slotData.slots.includes(booking.time)) {
        setError('Lo slot selezionato non e piu disponibile. Torna indietro e seleziona un altro orario.')
        setSubmitting(false)
        return
      }

      // Build booking payload — include resourceId if selected.
      // For logged-in users: ALWAYS construct from customerAuth (the server-verified source)
      // to avoid stale/empty React state. For guests: use form state as-is.
      const customerPayload = customerAuth
        ? {
            customerName: splitNome(customerAuth.nome).firstName,
            customerSurname: splitNome(customerAuth.nome).lastName,
            customerPhone: customerAuth.telefono?.startsWith('temp_') ? booking.customer.customerPhone : (customerAuth.telefono || ''),
            customerEmail: customerAuth.email || '',
          }
        : booking.customer

      const payload = {
        serviceIds: booking.serviceIds,
        date: booking.date,
        time: booking.time,
        ...(booking.resourceId ? { resourceId: booking.resourceId } : {}),
        customer: customerPayload,
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore nella prenotazione')
      }

      const createdBooking = await res.json()
      setConfirmedBookingId(createdBooking.id || null)
      setShopName(createdBooking.shopName || '')

      setStep(5) // Success step

      // Save or clear localStorage based on rememberMe (only relevant for guests)
      if (!customerAuth) {
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella prenotazione')
    } finally {
      setSubmitting(false)
    }
  }

  const canGoNext = () => {
    if (step === 1) return booking.serviceIds.length > 0
    if (step === 2) return true // Operator step: "Qualsiasi" is always pre-selected
    if (step === 3) return booking.date && booking.time
    return true
  }

  const goNext = () => {
    if (step === 4) {
      handleSubmit()
    } else {
      setStep(prev => prev + 1)
    }
  }

  // ==================== HELPERS ====================

  function formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

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

  function buildGoogleCalendarUrl(): string {
    const serviceName = selectedServices.map(s => s.name).join(', ') || 'Appuntamento'
    const title = encodeURIComponent(`${serviceName} — ${shopName || 'IntelliGenda'}`)

    // Create dates explicitly in Europe/Rome timezone
    const startRome = createInRome(booking.date, booking.time)
    const endRome = new Date(startRome.getTime() + totalSlotDuration * 60 * 1000)

    // Format as UTC for Google Calendar (with Z suffix)
    const startCal = startRome.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endCal = endRome.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const operatorLine = booking.resourceId ? `\nOperatore: ${selectedOperatorName}` : ''
    const details = encodeURIComponent(
      `Prenotazione confermata per ${serviceName}${operatorLine}\nTotale: €${totalPrice.toFixed(2)}\nDurata: ${formatDuration(totalDuration)}`
    )
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startCal}/${endCal}&details=${details}&ctz=Europe/Rome`
  }

  // ==================== RENDER ====================

  const stepLabels = [
    { num: 1, label: 'Servizi', icon: <Calendar className="w-4 h-4" /> },
    { num: 2, label: 'Operatore', icon: <Users className="w-4 h-4" /> },
    { num: 3, label: 'Data', icon: <Clock className="w-4 h-4" /> },
    { num: 4, label: 'Dati', icon: <User className="w-4 h-4" /> },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-stone-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => step > 1 && step < 5 ? setStep(prev => prev - 1) : router.push('/')}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="font-semibold text-stone-900">Prenota</h1>
        </div>

        {/* Steps indicator — 4 steps (confirmation is step 5, shown separately) */}
        {step < 5 && (
          <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
            {stepLabels.map(s => (
              <div key={s.num} className="flex-1 flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0 ${
                    step >= s.num
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    step >= s.num ? 'text-stone-900' : 'text-stone-400'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 4 && (
                  <div className={`flex-1 h-0.5 ${step > s.num ? 'bg-stone-900' : 'bg-stone-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && StepServices()}
            {step === 2 && StepOperator()}
            {step === 3 && StepCalendar()}
            {step === 4 && StepCustomerInfo()}
            {step === 5 && StepConfirmation()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer with Next button */}
      {step > 0 && step < 5 && (
        <footer className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-stone-200 p-4">
          <div className="max-w-lg mx-auto">
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {/* Selected services badge (step 2+) */}
            {step >= 2 && booking.serviceIds.length > 0 && (
              <div className="mb-3 text-xs text-stone-500 text-center">
                {booking.serviceIds.length} servizio{booking.serviceIds.length > 1 ? 'i' : ''} · {formatDuration(totalDuration)} · €{totalPrice.toFixed(2)}
              </div>
            )}

            <button
              onClick={goNext}
              disabled={!canGoNext() || submitting}
              className="w-full py-4 rounded-xl bg-stone-900 text-white font-medium text-base flex items-center justify-center gap-2 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  Prenotazione in corso...
                </>
              ) : step === 4 ? (
                hasCompleteProfile ? 'Conferma e Prenota' : 'Finalizza Prenotazione'
              ) : (
                <>
                  Continua
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
