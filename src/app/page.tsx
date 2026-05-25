'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, Sparkles, Phone, Mail, MapPin } from 'lucide-react'

interface BusinessConfig {
  id: string
  shopName: string
  shopDescription: string
  shopPhone?: string
  shopEmail?: string
  shopAddress?: string
  features?: string[]
}

export default function HomePage() {
  const [config, setConfig] = useState<BusinessConfig | null>(null)

  useEffect(() => {
    const fetchConfig = () => {
      fetch('/api/config')
        .then(res => {
          if (!res.ok) {
            // No tenant context, redirect to landing
            window.location.href = '/landing'
            return null
          }
          return res.json()
        })
        .then(data => { if (data && typeof data === 'object') setConfig(data) })
        .catch(() => {
          // If config fetch fails (network error or no tenant), redirect to landing
          window.location.href = '/landing'
        })
    }
    fetchConfig()
    const interval = setInterval(fetchConfig, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white">
      <main className="flex-1 flex flex-col items-center px-6 py-16">

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
            className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center shadow-lg"
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
