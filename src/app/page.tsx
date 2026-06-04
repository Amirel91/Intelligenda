'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, Phone, Mail, MapPin, Star, Clock } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CustomerNavbar } from '@/components/CustomerNavbar'

interface BusinessConfig {
  id: string
  shopName: string
  shortDescription?: string
  shopPhone?: string
  shopEmail?: string
  shopAddress?: string
  showAddress?: boolean
  showHours?: boolean
  features?: string[]
}

interface Service {
  id: string
  name: string
  price: number
  discountedPrice?: number
  durationMinutes: number
  featured?: boolean
}

interface WorkingHour {
  dayOfWeek: number
  openTime: string
  closeTime: string
  closed: boolean
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function HomePage() {
  const router = useRouter()
  const [config, setConfig] = useState<BusinessConfig | null>(null)
  const [featuredServices, setFeaturedServices] = useState<Service[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])

  // Secret admin access: 5 consecutive taps on shop logo
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSecretTap = useCallback(() => {
    tapCountRef.current += 1
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      tapTimerRef.current = null
      router.push('/admin')
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
        tapTimerRef.current = null
      }, 800)
    }
  }, [router])

  useEffect(() => {
    const fetchConfig = () => {
      fetch('/api/config')
        .then(res => {
          if (!res.ok) {
            window.location.href = '/landing'
            return null
          }
          return res.json()
        })
        .then(data => { if (data && typeof data === 'object') setConfig(data) })
        .catch(() => {
          window.location.href = '/landing'
        })
    }
    fetchConfig()
    const interval = setInterval(fetchConfig, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const featured = data.filter((s: Service) => s.featured).slice(0, 3)
          setFeaturedServices(featured)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch working hours if showHours is enabled
  useEffect(() => {
    if (config?.showHours !== false) {
      fetch('/api/working-hours')
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setWorkingHours(data) })
        .catch(() => {})
    }
  }, [config?.showHours])

  const handleFeaturedClick = (service: Service) => {
    const prefillData = JSON.stringify({ serviceId: service.id })
    document.cookie = `ig_prefill_service=${encodeURIComponent(prefillData)};path=/prenota;max-age=300;samesite=lax`
    router.push('/prenota')
  }

  // Get open days summary
  const openDays = workingHours.filter(wh => !wh.closed)
  const closedDays = workingHours.filter(wh => wh.closed)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white dark:from-stone-800 dark:to-stone-900">
      <CustomerNavbar />
      <main className="flex-1 flex flex-col items-center px-6 py-16 pt-16">

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-8 w-20 h-20 rounded-2xl overflow-hidden shadow-lg select-none cursor-default"
            onClick={handleSecretTap}
          >
            <Image src="/admin-icon.png" alt="Logo" width={80} height={80} className="w-full h-full object-contain" priority />
          </motion.div>

          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mb-3">
            {config?.shopName || 'Caricamento...'}
          </h1>

          {config?.shopDescription && (
            <p className="text-stone-500 dark:text-stone-400 text-base leading-relaxed mb-8">{config.shopDescription}</p>
          )}

          {/* Contact Info */}
          {(config?.shopPhone || config?.shopEmail || (config?.shopAddress && config?.showAddress !== false)) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8 space-y-2">
              {config?.shopPhone && (<a href={`tel:${config.shopPhone}`} className="flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 transition-colors"><Phone className="w-4 h-4" />{config.shopPhone}</a>)}
              {config?.shopEmail && (<a href={`mailto:${config.shopEmail}`} className="flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 transition-colors"><Mail className="w-4 h-4" />{config.shopEmail}</a>)}
              {config?.shopAddress && (<div className="flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-400"><MapPin className="w-4 h-4 shrink-0" />{config.shopAddress}</div>)}
            </motion.div>
          )}

          {/* CTA Button */}
          <Link href="/prenota">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-3 w-full max-w-xs mx-auto px-8 py-5 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-lg font-medium shadow-lg shadow-stone-900/20 dark:shadow-black/20 hover:shadow-xl hover:shadow-stone-900/30 dark:hover:shadow-black/30 transition-shadow cursor-pointer"
            >
              <CalendarDays className="w-6 h-6" />
              Prenota un appuntamento
            </motion.div>
          </Link>

          {/* Featured Services — super minimal, only service name */}
          {featuredServices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-10 w-full"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <h2 className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-widest">In evidenza</h2>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {featuredServices.map((service, i) => (
                  <motion.button
                    key={service.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.06 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleFeaturedClick(service)}
                    className="px-5 py-2.5 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium shadow-sm hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600 transition-all cursor-pointer"
                  >
                    {service.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Punti di Forza */}
          {config?.features?.filter(Boolean).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex flex-wrap justify-center gap-2 mt-8"
            >
              {config.features.filter(Boolean).map((feature, i) => (
                <span
                  key={i}
                  className="px-3.5 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-xs font-medium"
                >
                  {feature}
                </span>
              ))}
            </motion.div>
          )}

          {/* Working Hours */}
          {config?.showHours !== false && workingHours.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="mt-10 w-full"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <h2 className="text-xs font-medium text-stone-400 uppercase tracking-widest">Orari</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-w-xs mx-auto text-xs">
                {workingHours.map((wh) => (
                  <div key={wh.dayOfWeek} className="flex justify-between items-center py-1">
                    <span className="text-stone-500">{DAY_NAMES[wh.dayOfWeek - 1]}</span>
                    {wh.closed ? (
                      <span className="text-stone-300">Chiuso</span>
                    ) : (
                      <span className="text-stone-600 font-medium">{wh.openTime}–{wh.closeTime}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Powered by IntelliGenda */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-16 text-center"
          >
            <p className="text-xs text-stone-300 select-none">Powered by IntelliGenda</p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
