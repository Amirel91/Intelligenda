'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CalendarDays, Phone, Mail, MapPin, Star } from 'lucide-react'
            onClick={handleSecretTap}
          >
            <Image src="/logo.png" alt="Logo" width={80} height={80} className="w-full h-full object-contain" priority />
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
                <h2 className="text-xs font-medium text-stone-400 uppercase tracking-widest">In evidenza</h2>
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
                    className="px-5 py-2.5 rounded-full bg-white border border-stone-200 text-stone-700 text-sm font-medium shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer"
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
                  className="px-3.5 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium"
                >
                  {feature}
                </span>
              ))}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
