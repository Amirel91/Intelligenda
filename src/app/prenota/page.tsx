'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { createInRome } from '@/lib/timezone'
import { CalendarSkeleton, SlotsSkeleton } from '@/components/ui/calendar-skeleton'
import { RatingInteraction } from '@/components/ui/rating-interaction'
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
  ChevronDown,
  Search,
  PartyPopper,
  CalendarX,
  Download,
  X,
  ExternalLink,
  LogIn,
  Mail,
  Star,
} from 'lucide-react'

// ==================== TYPES ====================

interface Service {
  id: string
  name: string
  description?: string
  category?: string
  price: number
  discountedPrice?: number
  durationMinutes: number
  cleanupMinutes: number
  bufferMinutes: number
  featured: boolean
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

  // Customer authentication state
  const [customerAuth, setCustomerAuth] = useState<CustomerAuthData | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Optional registration during booking (password-based)
  const [wantRegister, setWantRegister] = useState(false)
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null)
  const [couponValid, setCouponValid] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

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
  // Requirements: firstName >= 2 chars, phone >= 8 digits (no temp).
  // Surname is optional in Zod (not all cultures use surnames).
  const hasCompleteProfile = !!(
    customerAuth &&
    (() => {
      const { firstName } = splitNome(customerAuth.nome)
      return (
        firstName.length >= 2 &&
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

  // Keep form fields in sync whenever customerAuth changes (e.g. after login redirect)
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

  // Prefill service from homepage featured click
  useEffect(() => {
    try {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('ig_prefill_service='))
      if (cookie) {
        const json = decodeURIComponent(cookie.split('=')[1])
        const { serviceId } = JSON.parse(json)
        if (serviceId) {
          document.cookie = 'ig_prefill_service=;path=/prenota;max-age=0'
          setBooking(prev => ({ ...prev, serviceIds: [serviceId] }))
          setStep(2) // Jump to operator/date selection
        }
      }
    } catch {}
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

  const closedDatesSet = useMemo(() => new Set(closedDates), [closedDates])
  const isDayClosed = useCallback((dateStr: string) => closedDatesSet.has(dateStr), [closedDatesSet])

  const totalServiceDuration = useMemo(() => booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + (s?.durationMinutes || 0)
  }, 0), [booking.serviceIds, services])
  const totalCleanupDuration = useMemo(() => booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + ((s as Service)?.cleanupMinutes || 0)
  }, 0), [booking.serviceIds, services])
  const totalBufferDuration = useMemo(() => booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + ((s as Service)?.bufferMinutes || 0)
  }, 0), [booking.serviceIds, services])
  // Duration shown to customer (service + cleanup)
  const totalDuration = totalServiceDuration + totalCleanupDuration
  // Duration used for slot calculation (includes invisible buffer)
  const totalSlotDuration = useMemo(() => totalDuration + totalBufferDuration, [totalDuration, totalBufferDuration])

  const totalPrice = useMemo(() => booking.serviceIds.reduce((sum, id) => {
    const s = services.find(sv => sv.id === id)
    return sum + (s?.discountedPrice && s.discountedPrice > 0 ? s.discountedPrice : (s?.price || 0))
  }, 0), [booking.serviceIds, services])
  const discountAmount = couponValid && couponDiscount ? Math.min(couponDiscount, totalPrice) : 0
  const finalTotalPrice = totalPrice - discountAmount

  const selectedServices = useMemo(() => booking.serviceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[], [booking.serviceIds, services])

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

  // Render a single service card (reused for featured, categorized, and uncategorized lists)
  const ServiceCard = ({ service }: { service: Service }) => {
    const isSelected = booking.serviceIds.includes(service.id)
    const hasDiscount = service.discountedPrice && service.discountedPrice > 0
    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => toggleService(service.id)}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
          isSelected
            ? 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800/50'
            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                  isSelected ? 'bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100' : 'border-stone-300 dark:border-stone-600'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white dark:text-stone-900" />}
              </div>
              <span className="font-medium text-stone-900 dark:text-stone-100">{service.name}</span>
            </div>
            {service.description && (
              <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 ml-8">{service.description}</p>
            )}
          </div>
          <div className="text-right ml-4 shrink-0">
            {hasDiscount && (
              <div className="text-xs text-stone-400 dark:text-stone-500 line-through">€{service.price.toFixed(2)}</div>
            )}
            <div className={`font-semibold ${hasDiscount ? 'text-green-600 dark:text-green-400' : 'text-stone-900 dark:text-stone-100'}`}>€{(hasDiscount ? service.discountedPrice! : service.price).toFixed(2)}</div>
            <div className="text-stone-400 dark:text-stone-500 text-xs flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              {service.durationMinutes} min
            </div>
          </div>
        </div>
      </motion.button>
    )
  }

  // Search state for Step 1 service filtering
  const [searchQuery, setSearchQuery] = useState('')

  // Accordion state for service category dropdowns
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const StepServices = () => {
    const withCategory = services.filter(s => s.category)
    const uncategorized = services.filter(s => !s.category)

    // Group by category, preserving sort order
    const categoryMap = new Map<string, Service[]>()
    withCategory.forEach(s => {
      const cat = s.category!
      if (!categoryMap.has(cat)) categoryMap.set(cat, [])
      categoryMap.get(cat)!.push(s)
    })

    const hasGroups = categoryMap.size > 0

    // Helper: count selected services inside a group
    const countSelected = (items: Service[]) => items.filter(s => booking.serviceIds.includes(s.id)).length

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-1">Scegli i servizi</h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm">Seleziona uno o piu servizi per il tuo appuntamento</p>
        </div>

        {/* Search bar — Apple/iOS style */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca un servizio..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm outline-none focus:bg-stone-200/70 dark:focus:bg-stone-700/70 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* SEARCH MODE: flat filtered list */}
        {searchQuery.trim() !== '' && (() => {
          const q = searchQuery.toLowerCase().trim()
          const filtered = services.filter(s =>
            s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
          )
          return (
            <div>
              {filtered.length === 0 && (
                <p className="text-stone-400 dark:text-stone-500 text-sm text-center py-6">Nessun servizio trovato per &ldquo;{searchQuery.trim()}&rdquo;</p>
              )}
              <div className="space-y-3">
                {filtered.map(s => <ServiceCard key={s.id} service={s} />)}
              </div>
            </div>
          )
        })()}

        {/* DEFAULT MODE: accordion groups (when search is empty) */}
        {searchQuery.trim() === '' && !hasGroups && (
          <div className="space-y-3">
            {services.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        )}

        {searchQuery.trim() === '' && hasGroups && (
          <div className="space-y-3">
            {Array.from(categoryMap.entries()).map(([category, items]) => {
              const isOpen = openCategories.has(category)
              const selectedCount = countSelected(items)
              return (
                <div key={category} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">{category}</h3>
                      <span className="text-xs text-stone-400 dark:text-stone-500">{items.length} servizi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[10px] font-semibold flex items-center justify-center">
                          {selectedCount}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-stone-400 dark:text-stone-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2">
                          {items.map(s => <ServiceCard key={s.id} service={s} />)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}

            {/* Uncategorized services — always visible */}
            {uncategorized.length > 0 && (
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 overflow-hidden">
                <button
                  onClick={() => toggleCategory('__uncategorized__')}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Altri servizi</h3>
                    <span className="text-xs text-stone-400 dark:text-stone-500">{uncategorized.length} servizi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {countSelected(uncategorized) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[10px] font-semibold flex items-center justify-center">
                        {countSelected(uncategorized)}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-stone-400 dark:text-stone-500 transition-transform duration-200 ${openCategories.has('__uncategorized__') ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {openCategories.has('__uncategorized__') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2">
                        {uncategorized.map(s => <ServiceCard key={s.id} service={s} />)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

      {/* Selection summary */}
      {booking.serviceIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-between"
        >
          <div>
            <span className="text-stone-400 dark:text-stone-500 text-sm">Servizi selezionati</span>
            <div className="font-semibold">
              {booking.serviceIds.length} servizio{booking.serviceIds.length > 1 ? 'i' : ''} · {formatDuration(totalDuration)}
            </div>
            {totalCleanupInList > 0 && (
              <div className="text-stone-400 dark:text-stone-500 text-xs mt-0.5">incl. {totalCleanupInList} min di pulizia/organizzazione</div>
            )}
          </div>
          <div className="text-right">
            <span className="text-stone-400 dark:text-stone-500 text-sm">Totale</span>
            <div className="font-semibold">€{totalPrice.toFixed(2)}</div>
          </div>
        </motion.div>
      )}
    </div>
    )
  }

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
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-1">Scegli un operatore</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm">Caricamento operatori disponibili...</p>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-stone-200 dark:bg-stone-700 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-1">Scegli un operatore</h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm">Seleziona chi ti assistera, oppure scegli il primo disponibile</p>
        </div>

        <div className="space-y-3">
          {/* "Any operator" default option */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => selectOperator(null)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              !booking.resourceId
                ? 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800/50'
                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  !booking.resourceId ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-stone-900 dark:text-stone-100">Qualsiasi operatore disponibile</div>
                <div className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">Verra assegnato il primo operatore libero</div>
              </div>
              {!booking.resourceId && <Check className="w-5 h-5 text-stone-900 dark:text-stone-100 shrink-0" />}
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
                    ? 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800/50'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isSelected ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {resource.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-stone-900 dark:text-stone-100">{resource.name}</div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-stone-900 dark:text-stone-100 shrink-0" />}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Selected operator summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-sm text-stone-500 dark:text-stone-400 text-center"
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
  const [calendarLoading, setCalendarLoading] = useState(false)

  const fetchMonthAvailability = useCallback(async (year: number, month: number) => {
    if (totalSlotDuration === 0) return
    setCalendarLoading(true)
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
    } finally {
      setCalendarLoading(false)
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

  const calendarDays = useMemo(() => {
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
  }, [calendarMonth])

  const getDayColor = (dateStr: string, isPast: boolean) => {
    if (isPast) return 'text-stone-300 dark:text-stone-600'
    if (isDayClosed(dateStr)) return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50'
    const avail = dayAvailabilities[dateStr]
    if (!avail || avail === 'none') return 'text-stone-300 dark:text-stone-600'
    if (avail === 'high' || avail === 'medium') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
    // 'low' = pochi posti ma ancora disponibili -> giallo (NON rosso)
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
  }

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
  const dayNames = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

  const StepCalendar = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-1">Scegli data e ora</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          Durata totale: {formatDuration(totalDuration)} · {totalPrice.toFixed(2)}€
          {booking.resourceId && (
            <span className="ml-1">· {selectedOperatorName}</span>
          )}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-stone-500 dark:text-stone-400">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Disponibile</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> Pochi posti</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Completo</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300 border border-red-400" /> Chiuso</div>
      </div>

      {/* Calendar */}
      {calendarLoading ? (
        <CalendarSkeleton />
      ) : (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <span className="font-semibold text-stone-900 dark:text-stone-100">
            {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
          </span>
          <button
            onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-medium text-stone-400 dark:text-stone-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => (
            <button
              key={i}
              disabled={day.isPast || isDayClosed(day.dateStr) || (dayAvailabilities[day.dateStr] === 'none' && !day.isPast && day.date > 0)}
              onClick={() => day.date > 0 && !day.isPast && !isDayClosed(day.dateStr) && fetchSlotsForDate(day.dateStr)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                day.date === 0
                  ? ''
                  : booking.date === day.dateStr
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold'
                  : getDayColor(day.dateStr, day.isPast)
              } ${day.date > 0 && !day.isPast && !isDayClosed(day.dateStr) ? 'hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer' : ''}`}
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
      )}

      {/* Time slots */}
      {booking.date && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
            {loadingSlots ? 'Caricamento orari...' : `Orari disponibili per ${formatDisplayDate(booking.date)}`}
          </h3>

          {loadingSlots ? (
            <SlotsSkeleton />
          ) : availableSlots.length === 0 ? (
            <p className="text-stone-400 dark:text-stone-500 text-sm">Nessun orario disponibile per questa data</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map(slot => (
                <motion.button
                  key={slot}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setBooking(prev => ({ ...prev, time: slot }))}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    booking.time === slot
                      ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600'
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

  // ==================== ACCOUNT SECTION (below form) ====================

  // SITUATION A: Guest — amber box below form redirecting to /login
  // SITUATION B: Logged-in, complete profile — hidden (welcome shown instead)
  // SITUATION C: Logged-in, incomplete profile — blue box above form
  const AccountSection = () => {
    // Situation C: Logged in but incomplete profile — blue info box
    if (customerAuth && !hasCompleteProfile) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 truncate">
              Account connesso{customerAuth.email ? ` — ${customerAuth.email}` : ''}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Completa i dati qui sotto per confermare la prenotazione.</p>
          </div>
        </motion.div>
      )
    }

    // Situation B: Complete profile — no box needed (welcome card shown instead)
    if (hasCompleteProfile) return null

    // Situation A: Guest — amber box redirecting to /login
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Divider line with text */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
          <span className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap">oppure</span>
          <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
        </div>

        <Link
          href="/login?callback=/prenota"
          className="w-full p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 flex items-center gap-3 text-left hover:bg-amber-100/60 dark:hover:bg-amber-900/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <LogIn className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Hai gia un account?</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Accedi per gestire le tue prenotazioni.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
        </Link>
      </motion.div>
    )
  }

  // ==================== STEP 4: CUSTOMER INFO ====================

  const validateForm = () => {
    // If logged in with a COMPLETE profile (verified by hasCompleteProfile),
    // the form is hidden — data comes directly from customerAuth in handleSubmit.
    if (hasCompleteProfile) return true

    const errors: Record<string, string> = {}
    if (!booking.customer.customerName.trim()) errors.customerName = 'Nome obbligatorio'
    // customerSurname is optional (not all cultures use surnames)
    if (!booking.customer.customerPhone.trim()) errors.customerPhone = 'Telefono obbligatorio'
    else if (!/^[+]?[\d\s()-]{8,}$/.test(booking.customer.customerPhone)) errors.customerPhone = 'Telefono non valido'
    if (booking.customer.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.customer.customerEmail)) {
      errors.customerEmail = 'Email non valida'
    }
    // Registration password validation
    if (wantRegister) {
      if (!booking.customer.customerEmail.trim()) errors.customerEmail = 'Email obbligatoria per la registrazione'
      if (!regPassword || regPassword.length < 6) errors.regPassword = 'La password deve avere almeno 6 caratteri'
      if (regPassword !== regPasswordConfirm) errors.regPasswordConfirm = 'Le password non coincidono'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validate coupon
  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCouponValid(false)
    setCouponDiscount(null)
    try {
      const res = await fetch(`/api/coupon/validate?code=${encodeURIComponent(couponCode.trim())}`)
      const data = await res.json()
      if (data.valid) {
        setCouponValid(true)
        setCouponDiscount(data.discountAmount)
      } else {
        setCouponError(data.error || 'Codice non valido')
      }
    } catch {
      setCouponError('Errore nella verifica')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setCouponCode('')
    setCouponValid(false)
    setCouponDiscount(null)
    setCouponError('')
  }

  // Reusable booking summary block (shared by logged-in and guest views)
  const BookingSummaryBlock = () => (
    <div className="mb-6 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
      <div className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Riepilogo</div>
      <div className="space-y-1 text-sm">
        {booking.resourceId && (
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">Operatore</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{selectedOperatorName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-stone-500 dark:text-stone-400">Data</span>
          <span className="font-medium text-stone-900 dark:text-stone-100">{formatDisplayDate(booking.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 dark:text-stone-400">Ora</span>
          <span className="font-medium text-stone-900 dark:text-stone-100">{booking.time}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 dark:text-stone-400">Durata</span>
          <span className="font-medium text-stone-900 dark:text-stone-100">{formatDuration(totalServiceDuration)}{totalCleanupInList > 0 ? ` + ${totalCleanupInList} min pulizia` : ''}</span>
        </div>
        <div className="border-t border-stone-200 dark:border-stone-700 pt-1 mt-1">
          {selectedServices.map(s => (
            <div key={s.id} className="flex justify-between items-center">
              <span className="text-stone-600 dark:text-stone-300">{s.name}</span>
              <div className="text-right">
                {s.discountedPrice && s.discountedPrice > 0 && (
                  <span className="text-xs text-stone-400 dark:text-stone-500 line-through mr-1">€{s.price.toFixed(2)}</span>
                )}
                <span className="font-medium text-stone-900 dark:text-stone-100">{(s.discountedPrice && s.discountedPrice > 0 ? s.discountedPrice : s.price).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 pt-1">
            <span className="font-medium">Sconto</span>
            <span className="font-medium">-€{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-stone-200 dark:border-stone-700 pt-1 mt-1 flex justify-between">
          <span className="font-semibold text-stone-900 dark:text-stone-100">{discountAmount > 0 ? 'Totale scontato' : 'Totale'}</span>
          <span className="font-semibold text-stone-900 dark:text-stone-100">€{finalTotalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )

  // Reusable coupon input block (independent of auth state)
  const CouponInputBlock = () => (
    <div>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
        Hai un codice sconto? <span className="text-stone-400 dark:text-stone-500 font-normal">(opzionale)</span>
      </label>
      {couponValid ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="flex-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            -€{couponDiscount!.toFixed(2)} applicato
          </span>
          <button
            type="button"
            onClick={removeCoupon}
            className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={e => {
              setCouponCode(e.target.value.toUpperCase())
              if (couponError) setCouponError('')
            }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), validateCoupon())}
            placeholder="SCONTO10"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors uppercase ${
              couponError ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
            }`}
          />
          <button
            type="button"
            onClick={validateCoupon}
            disabled={couponLoading || !couponCode.trim()}
            className="px-4 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {couponLoading ? '...' : 'Applica'}
          </button>
        </div>
      )}
      {couponError && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{couponError}</p>}
    </div>
  )

  const StepCustomerInfo = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-1">I tuoi dati</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
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
            className="mb-6 bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-6 border border-stone-100 dark:border-stone-800"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-stone-900 dark:bg-stone-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-white dark:text-stone-900">
                  {customerAuth.nome?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  Bentornato, {customerAuth.nome?.split(' ')[0] || 'Cliente'}!
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Convalidiamo la tua prenotazione utilizzando i dati del tuo profilo.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                <User className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                <span>{customerAuth.nome}</span>
              </div>
              {customerAuth.telefono && !customerAuth.telefono.startsWith('temp_') && (
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span>{customerAuth.telefono}</span>
                </div>
              )}
              {customerAuth.email && (
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <Mail className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <span>{customerAuth.email}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Booking summary */}
          <BookingSummaryBlock />

          {/* Coupon code input — always visible for logged-in users */}
          {CouponInputBlock()}
        </>
      ) : (
        /* ===== GUEST or INCOMPLETE PROFILE: form first, then account box below ===== */
        <>
          {/* SITUATION C: Blue info box (only if logged-in but incomplete profile) */}
          {customerAuth && !hasCompleteProfile && <AccountSection />}

          {/* Booking summary */}
          <BookingSummaryBlock />

          {/* Guest form */}
          <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Nome *</label>
          <input
            type="text"
            value={booking.customer.customerName}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerName: e.target.value } }))
              if (formErrors.customerName) setFormErrors(prev => ({ ...prev, customerName: '' }))
            }}
            placeholder="Mario"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
              formErrors.customerName ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
            }`}
          />
          {formErrors.customerName && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.customerName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Cognome *</label>
          <input
            type="text"
            value={booking.customer.customerSurname}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerSurname: e.target.value } }))
              if (formErrors.customerSurname) setFormErrors(prev => ({ ...prev, customerSurname: '' }))
            }}
            placeholder="Rossi"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
              formErrors.customerSurname ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
            }`}
          />
          {formErrors.customerSurname && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.customerSurname}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Telefono *</label>
          <input
            type="tel"
            value={booking.customer.customerPhone}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerPhone: e.target.value } }))
              if (formErrors.customerPhone) setFormErrors(prev => ({ ...prev, customerPhone: '' }))
            }}
            placeholder="+39 333 1234567"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
              formErrors.customerPhone ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
            }`}
          />
          {formErrors.customerPhone && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.customerPhone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Email <span className="text-stone-400 dark:text-stone-500 font-normal">(opzionale)</span>
          </label>
          <input
            type="email"
            value={booking.customer.customerEmail}
            onChange={e => {
              setBooking(prev => ({ ...prev, customer: { ...prev.customer, customerEmail: e.target.value } }))
              if (formErrors.customerEmail) setFormErrors(prev => ({ ...prev, customerEmail: '' }))
            }}
            placeholder="mario@email.com"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
              formErrors.customerEmail ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
            }`}
          />
          {formErrors.customerEmail && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.customerEmail}</p>}
        </div>

        {/* Coupon code input */}
        {CouponInputBlock()}

        {/* Ricordami checkbox — only for guests */}
        {!customerAuth && (
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:ring-stone-900 dark:focus:ring-stone-100"
            />
            <span className="text-sm text-stone-600 dark:text-stone-400">Ricordami per la prossima prenotazione</span>
          </label>
        )}
          </div>

          {/* Optional registration — only for guests, with email required */}
          {!customerAuth && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={wantRegister}
                  onChange={e => {
                    setWantRegister(e.target.checked)
                    if (!e.target.checked) {
                      setRegPassword('')
                      setRegPasswordConfirm('')
                      setFormErrors(prev => {
                        const { regPassword, regPasswordConfirm, ...rest } = prev
                        return rest
                      })
                    }
                  }}
                  className="w-4 h-4 mt-0.5 rounded border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:ring-stone-900 dark:focus:ring-stone-100"
                />
                <div>
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">
                    Voglio registrarmi per salvare i miei dati
                  </span>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                    Crea un account per gestire le tue prenotazioni in futuro. Ti invieremo i dati di accesso via email.
                  </p>
                </div>
              </label>

              {/* Dynamic password fields */}
              <AnimatePresence>
                {wantRegister && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-3 pl-6 border-l-2 border-amber-200 dark:border-amber-800">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Crea Password *</label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={e => {
                            setRegPassword(e.target.value)
                            if (formErrors.regPassword) setFormErrors(prev => ({ ...prev, regPassword: '' }))
                          }}
                          placeholder="Almeno 6 caratteri"
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                            formErrors.regPassword ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                          }`}
                        />
                        {formErrors.regPassword && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.regPassword}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Conferma Password *</label>
                        <input
                          type="password"
                          value={regPasswordConfirm}
                          onChange={e => {
                            setRegPasswordConfirm(e.target.value)
                            if (formErrors.regPasswordConfirm) setFormErrors(prev => ({ ...prev, regPasswordConfirm: '' }))
                          }}
                          placeholder="Ripeti la password"
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none transition-colors ${
                            formErrors.regPasswordConfirm ? 'border-red-400' : 'border-stone-200 dark:border-stone-700 focus:border-stone-900 dark:focus:border-stone-100'
                          }`}
                        />
                        {formErrors.regPasswordConfirm && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.regPasswordConfirm}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* SITUATION A: Amber account box BELOW form fields (only for guests) */}
          {!customerAuth && <AccountSection />}
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
        className="mx-auto mb-6 w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"
      >
        <PartyPopper className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-2">Prenotazione confermata!</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-8">Grazie, ti aspettiamo!</p>

        <div className="text-left max-w-sm mx-auto p-5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">Data</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{formatDisplayDate(booking.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">Ora</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{booking.time}</span>
          </div>
          {booking.resourceId && (
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Operatore</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{selectedOperatorName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-stone-500 dark:text-stone-400">Cliente</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{booking.customer.customerName} {booking.customer.customerSurname}</span>
          </div>
          <div className="border-t border-stone-200 dark:border-stone-700 pt-2 space-y-1">
            {selectedServices.map(s => (
              <div key={s.id} className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-300">{s.name}</span>
                <span className={`font-medium ${discountAmount > 0 ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}>€{s.price.toFixed(2)}</span>
              </div>
            ))}
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span className="font-medium">Sconto applicato</span>
                <span className="font-medium">-€{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1 border-t border-stone-200 dark:border-stone-700">
              <span>{discountAmount > 0 ? 'Totale scontato' : 'Totale'}</span>
              <span>€{finalTotalPrice.toFixed(2)}</span>
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
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Aggiungi al Calendario
            <ExternalLink className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
          </a>

          {/* Cancellation Link */}
          {confirmedBookingId && (
            <button
              onClick={async () => {
                try {
                  await fetch(`/api/bookings/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId: confirmedBookingId }),
                  })
                  setConfirmedBookingId(null)
                } catch { /* silent */ }
              }}
              className="block w-full text-center px-4 py-2.5 rounded-xl text-stone-400 dark:text-stone-500 text-xs hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Annulla questa prenotazione
            </button>
          )}
        </div>

        {/* Feedback Rating */}
        {confirmedBookingId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 mx-auto max-w-sm"
          >
            <RatingInteraction
              onChange={(rating) => {
                fetch('/api/feedback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ bookingId: confirmedBookingId, rating }),
                }).catch(() => { /* silent */ })
              }}
            />
          </motion.div>
        )}

        <button
          onClick={() => router.push('/')}
          className="mt-6 px-8 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors print:hidden"
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Scarica l&apos;app sul tuo telefono
              </button>
            ) : isIOSSafari && showIOSHint ? (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-sm text-blue-800 dark:text-blue-300 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Installa IntelliGenda</span>
                  <button onClick={dismissPWAInstall} className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ol className="space-y-1 list-decimal list-inside text-blue-700 dark:text-blue-400">
                  <li>Tocca il pulsante <strong>Condividi</strong> in basso</li>
                  <li>Seleziona <strong>Aggiungi a Home</strong></li>
                  <li>Conferma con <strong>Aggiungi</strong></li>
                </ol>
              </div>
            ) : (
              <button
                onClick={promptPWAInstall}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
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
      // Build booking payload — include resourceId if selected.
      // When hasCompleteProfile: construct from customerAuth (server-verified source).
      // Otherwise (guest or incomplete profile): use booking.customer (form state).
      const customerPayload = hasCompleteProfile
        ? {
            customerName: splitNome(customerAuth!.nome).firstName,
            customerSurname: splitNome(customerAuth!.nome).lastName,
            customerPhone: customerAuth!.telefono?.startsWith('temp_') ? booking.customer.customerPhone : (customerAuth!.telefono || ''),
            customerEmail: customerAuth!.email || '',
          }
        : booking.customer

      const payload = {
        serviceIds: booking.serviceIds,
        date: booking.date,
        time: booking.time,
        ...(booking.resourceId ? { resourceId: booking.resourceId } : {}),
        customer: customerPayload,
        // Optional registration: send password only if guest chose to register
        ...(wantRegister && regPassword && regPassword === regPasswordConfirm && !customerAuth ? { registerPassword: regPassword } : {}),
        // Coupon code (if validated)
        ...(couponValid && couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
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
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-stone-600 border-t-stone-900 dark:border-stone-100 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-stone-950/80 backdrop-blur-lg border-b border-stone-200 dark:border-stone-700">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => step > 1 && step < 5 ? setStep(prev => prev - 1) : router.push('/')}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <h1 className="font-semibold text-stone-900 dark:text-stone-100">Prenota</h1>
        </div>

        {/* Steps indicator — 4 steps (confirmation is step 5, shown separately) */}
        {step < 5 && (
          <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
            {stepLabels.map(s => (
              <div key={s.num} className="flex-1 flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0 ${
                    step >= s.num
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    step >= s.num ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 4 && (
                  <div className={`flex-1 h-0.5 ${step > s.num ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-700'}`} />
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
        <footer className="sticky bottom-0 bg-white/80 dark:bg-stone-950/80 backdrop-blur-lg border-t border-stone-200 dark:border-stone-700 p-4">
          <div className="max-w-lg mx-auto">
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Selected services badge (step 2+) */}
            {step >= 2 && booking.serviceIds.length > 0 && (
              <div className="mb-3 text-xs text-stone-500 dark:text-stone-400 text-center">
                {booking.serviceIds.length} servizio{booking.serviceIds.length > 1 ? 'i' : ''} · {formatDuration(totalDuration)} · €{totalPrice.toFixed(2)}
              </div>
            )}

            <button
              onClick={goNext}
              disabled={!canGoNext() || submitting}
              className="w-full py-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-base flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white/30 dark:border-stone-900/30 border-t-white dark:border-stone-900 rounded-full" />
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
