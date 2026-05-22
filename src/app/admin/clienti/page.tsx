'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Download, Phone, Mail, Calendar, Euro } from 'lucide-react'

interface ClientRow {
  customerName: string
  customerSurname: string
  customerPhone: string
  customerEmail: string | null
  totalBookings: number
  totalSpent: number
  firstBooking: string
  lastBooking: string
}

export default function AdminClienti() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'bookings' | 'spent' | 'last'>('bookings')

  useEffect(() => {
    fetch('/api/clients')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.customerSurname.toLowerCase().includes(q) ||
        c.customerPhone.includes(q) ||
        (c.customerEmail || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return `${a.customerSurname} ${a.customerName}`.localeCompare(`${b.customerSurname} ${b.customerName}`)
        case 'bookings': return b.totalBookings - a.totalBookings
        case 'spent': return b.totalSpent - a.totalSpent
        case 'last': return new Date(b.lastBooking).getTime() - new Date(a.lastBooking).getTime()
        default: return 0
      }
    })

  const formatRomeDate = (iso: string) =>
    new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' })

  const exportCSV = () => {
    const header = 'Nome,Cognome,Telefono,Email,Prenotazioni,Totale Speso,Prima Prenotazione,Ultima Prenotazione'
    const rows = filtered.map(c =>
      `"${c.customerName}","${c.customerSurname}","${c.customerPhone}","${c.customerEmail || ''}",${c.totalBookings},${c.totalSpent.toFixed(2)},"${formatRomeDate(c.firstBooking)}","${formatRomeDate(c.lastBooking)}"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'clienti-intelligenda.csv'
    link.click()
  }

  const sortButtons: { key: typeof sortBy; label: string }[] = [
    { key: 'bookings', label: 'Prenotazioni' },
    { key: 'name', label: 'Nome' },
    { key: 'spent', label: 'Speso' },
    { key: 'last', label: 'Ultima visita' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Clienti</h1>
          <p className="text-stone-500 text-sm mt-1">
            Archivio clienti con {clients.length} {clients.length === 1 ? 'cliente' : 'clienti'} unici
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="print:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          Esporta CSV
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, telefono, email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-sm"
          />
        </div>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 shrink-0">
          {sortButtons.map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                sortBy === s.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Telefono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">Email</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-stone-500 uppercase">Prenotazioni</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">Totale Speso</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">Ultima Visita</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">
                    {search ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={`${c.customerPhone}-${c.customerName}-${i}`} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-xs font-semibold shrink-0">
                          {c.customerName[0]}{c.customerSurname[0]}
                        </div>
                        <div>
                          <div className="font-medium text-stone-900 text-sm">{c.customerName} {c.customerSurname}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">{c.customerPhone}</td>
                    <td className="px-4 py-3 text-sm text-stone-500">{c.customerEmail || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-stone-900 text-white font-medium">
                        {c.totalBookings}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-stone-900">
                      EUR{c.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-stone-500">
                      {formatRomeDate(c.lastBooking)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-stone-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-stone-400 text-sm">
              {search ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
            </div>
          ) : (
            filtered.map((c, i) => (
              <div key={`${c.customerPhone}-${c.customerName}-${i}`} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-semibold shrink-0">
                    {c.customerName[0]}{c.customerSurname[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-stone-900 truncate">{c.customerName} {c.customerSurname}</div>
                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.customerPhone}</span>
                      {c.customerEmail && (
                        <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.customerEmail}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-stone-900 text-white font-medium">
                      {c.totalBookings} prenotaz.
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-500 pl-[52px]">
                  <span className="flex items-center gap-1"><Euro className="w-3 h-3" />Totale: EUR{c.totalSpent.toFixed(2)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Ultima: {formatRomeDate(c.lastBooking)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary footer */}
      {filtered.length > 0 && (
        <div className="mt-3 text-xs text-stone-400 text-right">
          {filtered.length} {filtered.length === 1 ? 'cliente' : 'clienti'} trovati
          {search && ' (filtrati)'}
          {' · '}Totale storico: EUR{filtered.reduce((s, c) => s + c.totalSpent, 0).toFixed(2)}
        </div>
      )}
    </div>
  )
}
