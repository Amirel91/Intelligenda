'use client'

import { useState, useEffect } from 'react'
import { Check, Users, Plus, Pencil, Trash2, X, CalendarDays, Clock } from 'lucide-react'

interface Resource {
  id: string
  name: string
  active: boolean
  sortOrder: number
  _count: { bookings: number }
  services?: { id: string }[]
}

interface DayAvailability {
  id: string
  resourceId: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  closed: boolean
}

const DAY_NAMES = [
  { key: 1, label: 'Lunedi', short: 'Lun' },
  { key: 2, label: 'Martedi', short: 'Mar' },
  { key: 3, label: 'Mercoledi', short: 'Mer' },
  { key: 4, label: 'Giovedi', short: 'Gio' },
  { key: 5, label: 'Venerdi', short: 'Ven' },
  { key: 6, label: 'Sabato', short: 'Sab' },
  { key: 7, label: 'Domenica', short: 'Dom' },
]

function formatScheduleSummary(days: DayAvailability[]): string {
  const openDays = days.filter(d => !d.closed)
  if (openDays.length === 0) return 'Segue orari negozio'
  if (openDays.length === 7) {
    const first = openDays[0]
    if (openDays.every(d => d.openTime === first.openTime && d.closeTime === first.closeTime)) {
      return `Tutti i giorni ${first.openTime}-${first.closeTime}`
    }
  }
  // Group consecutive days with same hours
  const groups: { days: string[]; open: string; close: string }[] = []
  for (const d of openDays) {
    const last = groups[groups.length - 1]
    if (last && last.open === d.openTime && last.close === d.closeTime) {
      last.days.push(DAY_NAMES.find(n => n.key === d.dayOfWeek)?.short || '')
    } else {
      groups.push({ days: [DAY_NAMES.find(n => n.key === d.dayOfWeek)?.short || ''], open: d.openTime, close: d.closeTime })
    }
  }
  return groups.map(g => {
    if (g.days.length > 2) {
      return `${g.days[0]}-${g.days[g.days.length - 1]} ${g.open}-${g.close}`
    }
    return `${g.days.join(',')} ${g.open}-${g.close}`
  }).join(' / ')
}

export default function AdminPostazioni() {
  const [resources, setResources] = useState<Resource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [shopServices, setShopServices] = useState<{ id: string; name: string }[]>([])

  // Add resource
  const [newResourceName, setNewResourceName] = useState('')
  const [newResourceServiceIds, setNewResourceServiceIds] = useState<string[]>([])
  const [addingResource, setAddingResource] = useState(false)

  // Edit resource
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editName, setEditName] = useState('')
  const [editServiceIds, setEditServiceIds] = useState<string[]>([])
  const [savingResource, setSavingResource] = useState(false)

  // Delete resource
  const [deletingResource, setDeletingResource] = useState<string | null>(null)

  // Schedule editor state
  const [scheduleResourceId, setScheduleResourceId] = useState<string | null>(null)
  const [scheduleDays, setScheduleDays] = useState<DayAvailability[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  // Track which resources have custom schedules: resourceId → summary string | null
  const [resourceScheduleInfo, setResourceScheduleInfo] = useState<Map<string, string | null>>(new Map())

  const fetchShopServices = async () => {
    try {
      const res = await fetch('/api/services')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setShopServices(data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
      }
    } catch { /* silent */ }
  }

  const fetchResources = async () => {
    setResourcesLoading(true)
    try {
      const res = await fetch('/api/resources')
      if (res.ok) {
        const data = await res.json()
        setResources(Array.isArray(data) ? data : [])
      }
    } catch { /* silent */ }
    finally { setResourcesLoading(false) }
  }

  useEffect(() => {
    fetchResources()
    fetchShopServices()
  }, [])

  const handleAddResource = async () => {
    if (!newResourceName.trim()) return
    setAddingResource(true)
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newResourceName.trim(), serviceIds: newResourceServiceIds }),
      })
      if (!res.ok) {
        const data = await res.json()
        const details = data.debug ? `\n\nDettaglio: ${data.debug}` : ''
        const code = data.code && data.code !== 'unknown' ? `\nCodice: ${data.code}` : ''
        alert(`${data.error || 'Errore nella creazione'}${code}${details}`)
        console.error('[handleAddResource] Error:', data)
        return
      }
      setNewResourceName('')
      setNewResourceServiceIds([])
      fetchResources()
    } catch { alert('Errore di connessione') }
    finally { setAddingResource(false) }
  }

  const handleSaveResource = async (id: string) => {
    if (!editName.trim()) return
    setSavingResource(true)
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), serviceIds: editServiceIds }),
      })
      if (!res.ok) {
        const data = await res.json()
        const details = data.debug ? `\n\nDettaglio: ${data.debug}` : ''
        const code = data.code && data.code !== 'unknown' ? `\nCodice: ${data.code}` : ''
        alert(`${data.error || 'Errore'}${code}${details}`)
        console.error('[handleSaveResource] Error:', data)
        return
      }
      setEditingResource(null)
      setEditName('')
      setEditServiceIds([])
      fetchResources()
    } catch { alert('Errore di connessione') }
    finally { setSavingResource(false) }
  }

  const handleToggleResource = async (res: Resource) => {
    try {
      const response = await fetch(`/api/resources/${res.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !res.active }),
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Errore')
        return
      }
      fetchResources()
    } catch { alert('Errore di connessione') }
  }

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Eliminare questa postazione? Le prenotazioni associate non verranno cancellate.')) return
    setDeletingResource(id)
    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Errore')
        return
      }
      // Clean up schedule info for deleted resource
      setResourceScheduleInfo(prev => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
      fetchResources()
    } catch { alert('Errore di connessione') }
    finally { setDeletingResource(null) }
  }

  // ============ SCHEDULE EDITOR HANDLERS ============

  const handleOpenSchedule = async (resourceId: string) => {
    // If already open, toggle it closed
    if (scheduleResourceId === resourceId) {
      setScheduleResourceId(null)
      return
    }
    setScheduleResourceId(resourceId)
    setScheduleLoading(true)

    // Check if we already have this cached
    const cached = resourceScheduleInfo.get(resourceId)
    if (cached !== undefined && cached !== '__loading__') {
      // Fetch fresh data from API
    }

    try {
      const res = await fetch(`/api/resources/${resourceId}/availability`)
      if (res.ok) {
        const data = await res.json()
        setScheduleDays(data.days || [])
        const summary = formatScheduleSummary(data.days || [])
        setResourceScheduleInfo(prev => {
          const next = new Map(prev)
          next.set(resourceId, summary)
          return next
        })
      } else {
        console.error('Failed to load schedule')
      }
    } catch {
      console.error('Error loading schedule')
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleToggleDayClosed = (dayIndex: number) => {
    setScheduleDays(prev => {
      const updated = [...prev]
      updated[dayIndex] = {
        ...updated[dayIndex],
        closed: !updated[dayIndex].closed,
      }
      return updated
    })
  }

  const handleTimeChange = (dayIndex: number, field: 'openTime' | 'closeTime', value: string) => {
    setScheduleDays(prev => {
      const updated = [...prev]
      updated[dayIndex] = {
        ...updated[dayIndex],
        [field]: value,
      }
      return updated
    })
  }

  const handleSaveSchedule = async () => {
    if (!scheduleResourceId) return
    setScheduleSaving(true)
    try {
      const res = await fetch(`/api/resources/${scheduleResourceId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: scheduleDays }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Errore')
        return
      }
      const summary = formatScheduleSummary(scheduleDays)
      setResourceScheduleInfo(prev => {
        const next = new Map(prev)
        next.set(scheduleResourceId, summary)
        return next
      })
      setScheduleResourceId(null)
    } catch {
      alert('Errore di connessione')
    } finally {
      setScheduleSaving(false)
    }
  }

  const handleResetSchedule = async () => {
    if (!scheduleResourceId) return
    if (!confirm('Rimuovere gli orari personalizzati? La postazione seguirà gli orari del negozio.')) return
    setScheduleSaving(true)
    try {
      // Set all days to closed to delete all custom availability
      const allClosed = scheduleDays.map(d => ({ ...d, closed: true }))
      const res = await fetch(`/api/resources/${scheduleResourceId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: allClosed }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Errore')
        return
      }
      setScheduleDays(allClosed)
      setResourceScheduleInfo(prev => {
        const next = new Map(prev)
        next.set(scheduleResourceId, null)
        return next
      })
      setScheduleResourceId(null)
    } catch {
      alert('Errore di connessione')
    } finally {
      setScheduleSaving(false)
    }
  }

  return (
    <div className="max-w-3xl pb-20 sm:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold dark:text-stone-100 text-stone-900">Postazioni e Collaboratori</h1>
        <p className="dark:text-stone-400 text-stone-500 text-sm mt-1">
          Gestisci le postazioni o i collaboratori della tua attivita. I clienti potranno prenotare
          in parallelo sulle postazioni disponibili.
        </p>
      </div>

      {/* Resource list */}
      <div className="space-y-3 mb-8">
        {resourcesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 dark:border-stone-600 border-stone-300 border-t-stone-900 rounded-full" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 dark:bg-stone-900 bg-white rounded-xl border dark:border-stone-700 border-stone-200">
            <Users className="w-10 h-10 dark:text-stone-600 text-stone-300 mx-auto mb-3" />
            <p className="dark:text-stone-500 text-stone-400 text-sm">Nessuna postazione configurata</p>
            <p className="dark:text-stone-500 text-stone-400 text-xs mt-1">Aggiungi la prima postazione qui sotto</p>
          </div>
        ) : (
          resources.map((res) => (
            <div
              key={res.id}
              className={`bg-white rounded-xl border transition-colors ${
                editingResource?.id === res.id || scheduleResourceId === res.id
                  ? 'border-stone-900 shadow-lg ring-1 dark:ring-stone-100/10 ring-stone-900/10'
                  : res.active
                    ? 'dark:border-stone-700 border-stone-200'
                    : 'dark:border-stone-800 border-stone-100 opacity-60'
              }`}
            >
              {/* Resource row */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${res.active ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                  {editingResource?.id === res.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveResource(res.id)}
                      className="px-3 py-1.5 rounded-lg border-2 border-stone-900 text-sm dark:text-stone-100 text-stone-900 outline-none w-48"
                      autoFocus
                    />
                  ) : (
                    <div className="min-w-0">
                      <span className="text-sm font-medium dark:text-stone-100 text-stone-900 truncate block">{res.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {res._count.bookings > 0 && (
                          <span className="text-xs dark:text-stone-500 text-stone-400">{res._count.bookings} prenotaz.</span>
                        )}
                        {res.services && res.services.length > 0 ? (
                          <span className="text-xs dark:text-stone-500 text-stone-400">
                            {res.services.length} servizio{res.services.length > 1 ? 'i' : ''} abilitat{res.services.length === 1 ? 'o' : 'i'}
                          </span>
                        ) : (
                          <span className="text-xs dark:text-stone-500 text-stone-400">Tutti i servizi</span>
                        )}
                        {/* Schedule summary indicator */}
                        {resourceScheduleInfo.has(res.id) && (
                          <span className="inline-flex items-center gap-1 text-xs dark:text-amber-400 text-amber-600">
                            <Clock className="w-3 h-3" />
                            {resourceScheduleInfo.get(res.id) || 'Segue orari negozio'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {editingResource?.id === res.id ? (
                    <>
                      <button
                        onClick={() => handleSaveResource(res.id)}
                        disabled={savingResource || !editName.trim()}
                        className="p-2 rounded-lg dark:text-emerald-400 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                        title="Salva"
                      >
                        {savingResource ? (
                          <div className="animate-spin w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => { setEditingResource(null); setEditName(''); setEditServiceIds([]) }}
                        className="p-2 rounded-lg dark:text-stone-500 text-stone-400 dark:hover:bg-stone-700 hover:bg-stone-100 transition-colors"
                        title="Annulla"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleResource(res)}
                        className={`p-1.5 rounded-lg text-xs font-semibold px-2.5 transition-colors ${
                          res.active
                            ? 'dark:text-emerald-400 text-emerald-700 dark:bg-emerald-950/50 bg-emerald-50 dark:hover:bg-emerald-900/50 hover:bg-emerald-100'
                            : 'dark:text-stone-400 text-stone-500 dark:bg-stone-800 bg-stone-100 dark:hover:bg-stone-700 hover:bg-stone-200'
                        }`}
                        title={res.active ? 'Disattiva' : 'Riattiva'}
                      >
                        {res.active ? 'ATTIVA' : 'OFF'}
                      </button>
                      <button
                        onClick={() => { setEditingResource(res); setEditName(res.name); setEditServiceIds(res.services?.map(s => s.id) || []) }}
                        className="p-1.5 rounded-lg dark:text-stone-400 text-stone-500 dark:hover:bg-stone-700 hover:bg-stone-100 transition-colors"
                        title="Modifica"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenSchedule(res.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          scheduleResourceId === res.id
                            ? 'dark:text-amber-400 text-amber-600 dark:bg-amber-950/50 bg-amber-50'
                            : 'dark:text-stone-400 text-stone-500 dark:hover:bg-stone-700 hover:bg-stone-100'
                        }`}
                        title="Orari personalizzati"
                      >
                        <CalendarDays className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(res.id)}
                        disabled={deletingResource === res.id}
                        className="p-1.5 rounded-lg dark:text-red-400 text-red-500 dark:hover:bg-red-950/50 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        title="Elimina"
                      >
                        {deletingResource === res.id ? (
                          <div className="animate-spin w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Service assignment (expanded edit area) */}
              {editingResource?.id === res.id && shopServices.length > 0 && (
                <div className="px-4 pb-4 border-t dark:border-stone-800 border-stone-100">
                  <p className="text-xs font-semibold dark:text-stone-400 text-stone-500 uppercase tracking-wide mt-3 mb-2">
                    Servizi abilitati per questo operatore
                  </p>
                  <div className="space-y-1">
                    {shopServices.map(svc => {
                      const isChecked = editServiceIds.includes(svc.id)
                      return (
                        <label
                          key={svc.id}
                          className={`flex items-center gap-2.5 text-sm cursor-pointer py-2 px-3 rounded-lg transition-colors ${
                            isChecked ? 'dark:bg-stone-100 bg-stone-900 text-white' : 'dark:text-stone-300 text-stone-700 dark:hover:bg-stone-800 hover:bg-stone-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setEditServiceIds(prev =>
                                e.target.checked
                                  ? [...prev, svc.id]
                                  : prev.filter(sid => sid !== svc.id)
                              )
                            }}
                            className={`w-4 h-4 rounded border-2 transition-colors ${
                              isChecked
                                ? 'border-white dark:bg-stone-900 bg-white checked:bg-stone-900'
                                : 'dark:border-stone-600 border-stone-300 checked:bg-stone-900'
                            } dark:focus:ring-stone-400 focus:ring-stone-500`}
                          />
                          <span className="truncate">{svc.name}</span>
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs dark:text-stone-500 text-stone-400 mt-2">
                    {editServiceIds.length === 0
                      ? 'Nessun servizio selezionato = il collaboratore potra svolgere tutti i servizi.'
                      : `${editServiceIds.length} servizio${editServiceIds.length > 1 ? 'i selezionati' : ' selezionato'}`
                    }
                  </p>
                </div>
              )}

              {/* Schedule editor (expanded area) */}
              {scheduleResourceId === res.id && (
                <div className="px-4 pb-4 border-t dark:border-stone-800 border-stone-100">
                  {scheduleLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin w-5 h-5 border-2 dark:border-stone-600 border-stone-300 border-t-stone-900 rounded-full" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mt-3 mb-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 dark:text-stone-400 text-stone-500" />
                          <p className="text-xs font-semibold dark:text-stone-400 text-stone-500 uppercase tracking-wide">
                            Orari settimanali
                          </p>
                        </div>
                        <button
                          onClick={handleResetSchedule}
                          disabled={scheduleSaving || scheduleDays.every(d => d.closed)}
                          className="text-xs dark:text-stone-500 text-stone-400 dark:hover:text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          Ripristina orari negozio
                        </button>
                      </div>

                      <p className="text-xs dark:text-stone-500 text-stone-400 mb-3">
                        Definisci gli orari di apertura per ogni giorno della settimana. I giorni non configurati
                        saranno considerati chiusi per questa postazione.
                      </p>

                      <div className="space-y-2">
                        {scheduleDays.map((day, idx) => {
                          const dayInfo = DAY_NAMES.find(d => d.key === day.dayOfWeek)
                          return (
                            <div
                              key={day.dayOfWeek}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                day.closed
                                  ? 'dark:bg-stone-900/50 bg-stone-50 dark:border-stone-800 border-stone-100 opacity-60'
                                  : 'dark:bg-stone-800/30 bg-white dark:border-stone-700 border-stone-200'
                              }`}
                            >
                              {/* Day name */}
                              <span className="text-sm font-medium dark:text-stone-200 text-stone-800 w-20 shrink-0">
                                {dayInfo?.label || day.dayOfWeek}
                              </span>

                              {/* Closed toggle */}
                              <button
                                onClick={() => handleToggleDayClosed(idx)}
                                className={`shrink-0 relative w-10 h-5.5 rounded-full transition-colors ${
                                  day.closed
                                    ? 'dark:bg-stone-700 bg-stone-300'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: '40px', height: '22px' }}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                                    day.closed ? '' : 'translate-x-[18px]'
                                  }`}
                                />
                              </button>

                              {/* Time inputs */}
                              <div className="flex items-center gap-2 flex-1">
                                {day.closed ? (
                                  <span className="text-xs dark:text-stone-500 text-stone-400 italic">Chiuso</span>
                                ) : (
                                  <>
                                    <input
                                      type="time"
                                      value={day.openTime}
                                      onChange={(e) => handleTimeChange(idx, 'openTime', e.target.value)}
                                      className="px-2.5 py-1.5 rounded-lg border dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white text-xs dark:text-stone-200 text-stone-800 outline-none dark:focus:border-stone-500 focus:border-stone-400 w-28 transition-colors"
                                    />
                                    <span className="text-xs dark:text-stone-500 text-stone-400">—</span>
                                    <input
                                      type="time"
                                      value={day.closeTime}
                                      onChange={(e) => handleTimeChange(idx, 'closeTime', e.target.value)}
                                      className="px-2.5 py-1.5 rounded-lg border dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white text-xs dark:text-stone-200 text-stone-800 outline-none dark:focus:border-stone-500 focus:border-stone-400 w-28 transition-colors"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Save / Cancel schedule */}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={handleSaveSchedule}
                          disabled={scheduleSaving}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-stone-100 bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all"
                        >
                          {scheduleSaving ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Salva Orari
                        </button>
                        <button
                          onClick={() => setScheduleResourceId(null)}
                          disabled={scheduleSaving}
                          className="px-4 py-2 rounded-xl text-sm dark:text-stone-400 text-stone-500 dark:hover:bg-stone-800 hover:bg-stone-100 transition-colors"
                        >
                          Chiudi
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new resource section */}
      <div className="dark:bg-stone-900 bg-white rounded-xl border dark:border-stone-700 border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 dark:text-stone-400 text-stone-500" />
          <h2 className="font-semibold dark:text-stone-100 text-stone-900">Nuova Postazione</h2>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newResourceName}
            onChange={(e) => setNewResourceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddResource()}
            placeholder="Nome postazione (es. Poltrona 2, Dott. Rossi...)"
            className="flex-1 px-4 py-2.5 rounded-xl border-2 dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white text-sm dark:text-stone-100 text-stone-900 dark:placeholder-stone-500 placeholder-stone-400 outline-none dark:focus:border-stone-100 focus:border-stone-900 transition-colors"
          />
          <button
            onClick={handleAddResource}
            disabled={addingResource || !newResourceName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl dark:bg-stone-100 bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all"
          >
            {addingResource ? (
              <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Aggiungi
              </>
            )}
          </button>
        </div>

        {/* Service selection for new resource */}
        {shopServices.length > 0 && (
          <div className="p-4 rounded-xl dark:bg-stone-800/50 bg-stone-50 border dark:border-stone-800 border-stone-100">
            <p className="text-xs font-semibold dark:text-stone-400 text-stone-500 uppercase tracking-wide mb-2">
              Servizi per la nuova postazione (opzionale)
            </p>
            <div className="flex flex-wrap gap-2">
              {shopServices.map(svc => {
                const isChecked = newResourceServiceIds.includes(svc.id)
                return (
                  <button
                    key={svc.id}
                    onClick={() => setNewResourceServiceIds(prev =>
                      isChecked ? prev.filter(sid => sid !== svc.id) : [...prev, svc.id]
                    )}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      isChecked
                        ? 'dark:bg-stone-100 bg-stone-900 text-white border-stone-900'
                        : 'dark:border-stone-700 border-stone-200 dark:text-stone-400 text-stone-600 dark:hover:border-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {svc.name}
                  </button>
                )
              })}
            </div>
            {newResourceServiceIds.length > 0 && (
              <p className="text-xs dark:text-stone-500 text-stone-400 mt-2">
                {newResourceServiceIds.length} servizio{newResourceServiceIds.length > 1 ? 'i selezionati' : ' selezionato'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
