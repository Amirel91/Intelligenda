'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, Sparkles, Phone, Mail, MapPin, Clock, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CustomerNavbar } from '@/components/CustomerNavbar'

interface BusinessConfig {
  id: string
  shopName: string
  shopDescription: string
  shopPhone?: string
  shopEmail?: string
  shopAddress?: string
  features?: string[]
}

interface Service {
  id: string
  name: string
  price: number
  discountedPrice?: number
  durationMinutes: number
}

export default function HomePage() {
  const router = useRouter()
  const [config, setConfig] = useState<BusinessConfig | null>(null)
  const [featuredServices, setFeaturedServices] = useState<Service[]>([])

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

  const handleFeaturedClick = (service: Service) => {
    const prefillData = JSON.stringify({ serviceId: service.id })
    document.cookie = `ig_prefill_service=${encodeURIComponent(prefillData)};path=/prenota;max-age=300;samesite=lax`
    router.push('/prenota')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white">
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
            className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center shadow-lg select-none cursor-default"
            onClick={handleSecretTap}
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-3">
            {config?.shopName || 'Caricamento...'}
          </h1>

          {config?.shopDescription && (
            <p className="text-stone-500 text-base leading-relaxed mb-8">{config.shopDescription}</p>
          )}

          {/* Contact Info */}
          {(config?.shopPhone || config?.shopEmail || config?.shopAddress) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8 space-y-2">
              {config?.shopPhone && (<a href={`tel:${config.shopPhone}`} className="flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"><Phone className="w-4 h-4" />{config.shopPhone}</a>)}
              {config?.shopEmail && (<a href={`mailto:${config.shopEmail}`} className="flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"><Mail className="w-4 h-4" />{config.shopEmail}</a>)}
              {config?.shopAddress && (<div className="flex items-center justify-center gap-2 text-sm text-stone-500"><MapPin className="w-4 h-4 shrink-0" />{config.shopAddress}</div>)}
            </motion.div>
          )}

          {/* Featured Services */}
          {featuredServices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mb-10 w-full"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">In evidenza</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {featuredServices.map((service, i) => {
                  const hasDiscount = service.discountedPrice && service.discountedPrice > 0
                  const effectivePrice = hasDiscount ? service.discountedPrice! : service.price
                  return (
                    <motion.button
                      key={service.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFeaturedClick(service)}
                      className="text-left p-4 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer"
                    >
                      <h3 className="font-medium text-stone-900 text-sm mb-2 leading-tight">{service.name}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-stone-400 text-xs">
                          <Clock className="w-3 h-3" />
                          {service.durationMinutes} min
                        </div>
                        <div className="text-right">
                          {hasDiscount && (
                            <span className="text-[10px] text-stone-400 line-through block">€{service.price.toFixed(2)}</span>
                          )}
                          <span className={`text-sm font-semibold ${hasDiscount ? 'text-green-600' : 'text-stone-900'}`}>
                            €{effectivePrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* CTA Button */}
          <Link href="/prenota">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-3 w-full max-w-xs mx-auto px-8 py-5 rounded-2xl bg-stone-900 text-white text-lg font-medium shadow-lg shadow-stone-900/20 hover:shadow-xl hover:shadow-stone-900/30 transition-shadow cursor-pointer"
            >
              <CalendarDays className="w-6 h-6" />
              Prenota un appuntamento
            </motion.div>
          </Link>

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
                  className="px-3.5 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium"
                >
                  {feature}
                </span>
              ))}
            </motion.div>
          )}
        </motion.div>
      </main>

      <footer className="text-center pb-6">
        <Link href="/admin/login" className="text-xs text-stone-300 hover:text-stone-500 transition-colors">Area Admin</Link>
      </footer>
    </div>
  )
}
