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
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
        <p className="text-stone-500 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <StatCard
          icon={<CalendarCheck className="w-4 h-4" />}
          label="Prenotazioni Oggi"
          value={stats?.bookingsCount ?? 0}
        />
        <StatCard
          icon={<Euro className="w-4 h-4" />}
          label="Ricavi Oggi"
          value={`\u20AC${(stats?.revenue ?? 0).toFixed(2)}`}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Prenotazioni Totali"
          value={stats?.totalBookings ?? 0}
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="Ricavi Totali"
          value={`\u20AC${(stats?.totalRevenue ?? 0).toFixed(2)}`}
        />
        <StatCard
          icon={<Star className="w-4 h-4" />}
          label="Voto Medio"
          value={stats?.ratingAverage ? `${stats.ratingAverage}/5` : '-'}
        />
      </div>

      {/* Top Services */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-900 text-sm">Servizi piu richiesti (oggi)</h2>
          <a href="/admin/servizi" className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1">
            Vedi tutti <ArrowRight className="w-3 h-3" />
          </a>
        </div>
        {stats?.topServices && stats.topServices.length > 0 ? (
          <div className="space-y-2.5">
            {stats.topServices.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 py-1">
                <div className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-xs font-semibold text-stone-500">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{s.name}</p>
                  <p className="text-xs text-stone-400">{s.count} prenotazioni</p>
                </div>
                <p className="text-sm font-semibold text-stone-900">\u20AC{s.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-400 text-sm py-4 text-center">Nessuna prenotazione oggi</p>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center text-stone-500">
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{label}</p>
    </div>
  )
}
