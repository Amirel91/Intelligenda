'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'
import { ACTIVITY_TYPES } from '@/lib/activity-types'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function LandingPage() {
  const { setSelectedActivityType, navigate } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-orange-100/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-50/50 blur-3xl" />
      </div>

      {/* Hero */}
      <header className="pt-16 sm:pt-24 pb-8 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-4 py-1.5 text-sm font-medium text-amber-800 mb-6">
            ✨ La piattaforma per professionisti
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            Gestisci la tua attività{' '}
            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              con semplicità
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Il gestionale completo per professionisti. Prenotazioni, clienti,
            agenda — tutto in un&apos;unica piattaforma.
          </p>
        </motion.div>
      </header>

      {/* Activity type grid */}
      <main className="flex-1 px-4 pb-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto"
        >
          {ACTIVITY_TYPES.map((type) => {
            const Icon = type.icon
            return (
              <motion.div key={type.id} variants={item}>
                <Card
                  className="group cursor-pointer border border-transparent hover:border-amber-200 hover:shadow-md transition-all duration-200 py-4 sm:py-6"
                  onClick={() => {
                    setSelectedActivityType(type.id)
                    navigate('onboarding')
                  }}
                >
                  <CardContent className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 text-center">
                    <div
                      className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${type.bgColor} transition-transform duration-200 group-hover:scale-110`}
                    >
                      <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${type.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">
                        {type.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Inizia <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Hai già un account?{' '}
          <button
            onClick={() => navigate('login')}
            className="font-semibold text-amber-700 hover:text-amber-800 transition-colors underline-offset-4 hover:underline"
          >
            Accedi
          </button>
        </p>
        <p className="mt-3 text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} IntelliGenda — Tutti i diritti riservati
        </p>
      </footer>
    </div>
  )
}
