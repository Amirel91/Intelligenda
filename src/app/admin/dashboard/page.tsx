'use client'

import { useState, useEffect } from 'react'
import { CalendarCheck, Euro, TrendingUp, Clock, Star, ArrowRight } from 'lucide-react'

interface Stats {
  bookingsCount: number
  revenue: number
  totalBookings: number
  totalRevenue: number
  topServices: { name: string; count: number; revenue: number }[]
  ratingAverage: number | null
  ratingCount: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [today] = useState(() => new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }))

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 dark:border-stone-600 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold dark:text-stone-100 text-stone-900">Dashboard</h1>
        <p className="dark:text-stone-400 text-stone-500 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <StatCard
          icon={<CalendarCheck className="w-4 h-4" />}
          label="Prenotazioni Oggi"
          value={stats?.bookingsCount ?? 0}
          color="dark:bg-blue-950/50 bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Euro className="w-4 h-4" />}
          label="Ricavi Oggi"
          value={`€${(stats?.revenue ?? 0).toFixed(2)}`}
          color="dark:bg-emerald-950/50 bg-emerald-50 dark:text-emerald-400 text-emerald-600"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Prenotazioni Totali"
          value={stats?.totalBookings ?? 0}
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="Ricavi Totali"
          value={`€${(stats?.totalRevenue ?? 0).toFixed(2)}`}
          color="dark:bg-amber-950/50 bg-amber-50 dark:text-amber-400 text-amber-600"
        />
        <StatCard
          icon={<Star className="w-4 h-4" />}
          label="Voto Medio"
          value={stats?.ratingAverage ? `${stats.ratingAverage}/5` : '-'}
        />
      </div>

      {/* Top Services */}
      <div className="dark:bg-stone-900 bg-white rounded-xl border dark:border-stone-700 border-stone-200 p-6">
        <h2 className="font-semibold dark:text-stone-100 text-stone-900 mb-4">Servizi più richiesti (oggi)</h2>
        {stats?.topServices && stats.topServices.length > 0 ? (
          <div className="space-y-2.5">
            {stats.topServices.map((s, i) => (
              <div key={s.name} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg dark:bg-stone-800 bg-stone-100 flex items-center justify-center text-sm font-semibold dark:text-stone-400 text-stone-600">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium dark:text-stone-100 text-stone-900">{s.name}</div>
                  <div className="text-sm dark:text-stone-400 text-stone-500">{s.count} prenotazioni</div>
                </div>
                <div className="font-semibold dark:text-stone-100 text-stone-900">€{s.revenue.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="dark:text-stone-500 text-stone-400 text-sm">Nessuna prenotazione oggi</p>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="dark:bg-stone-900 bg-white rounded-xl border dark:border-stone-700 border-stone-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-sm dark:text-stone-400 text-stone-500">{label}</span>
      </div>
      <div className="text-2xl font-bold dark:text-stone-100 text-stone-900">{value}</div>
    </div>
  )
}
