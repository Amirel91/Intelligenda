'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, Clock, Euro, GripVertical, Timer, Zap, XCircle } from 'lucide-react'
import { getSuggestions } from '@/lib/service-suggestions'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  durationMinutes: number
  cleanupMinutes: number
  bufferMinutes: number
  active: boolean
  sortOrder: number
}

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  durationMinutes: 30,
  cleanupMinutes: 0,
  bufferMinutes: 0,
  active: true,
  sortOrder: 0,
}

export default function AdminServizi() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  // String-based input values to allow full clearing before re-typing
  const [priceStr, setPriceStr] = useState('0')
  const [durationStr, setDurationStr] = useState('30')
  const [cleanupStr, setCleanupStr] = useState('0')
  const [bufferStr, setBufferStr] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activityType, setActivityType] = useState<string>('ALTRO')
  const [configLoading, setConfigLoading] = useState(true)
  const [hiddenSuggestions, setHiddenSuggestions] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const slug = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]*)/)?.[1]
      if (!slug) return []
      const stored = localStorage.getItem(`ig_hidden_suggestions_${slug}`)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  const fetchServices = () => {
    fetch('/api/services?all=true')
      .then(res => res.json())
      .then(data => { setServices(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchServices() }, [])

  // Fetch activity type from config
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.activityType) setActivityType(data.activityType) })
      .catch(() => {})
      .finally(() => setConfigLoading(false))
  }, [])

  const suggestions = getSuggestions(activityType)

  const dismissSuggestion = (name: string) => {
    if (typeof window === 'undefined') return
    const slug = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]*)/)?.[1]
    if (!slug) return
    const updated = [...hiddenSuggestions, name]
    setHiddenSuggestions(updated)
    try { localStorage.setItem(`ig_hidden_suggestions_${slug}`, JSON.stringify(updated)) } catch {}
  }

  const dismissAllSuggestions = () => {
    if (typeof window === 'undefined') return
    const slug = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]*)/)?.[1]
    if (!slug) return
    const allNames = suggestions.map(s => s.name)
    setHiddenSuggestions(allNames)
    try { localStorage.setItem(`ig_hidden_suggestions_${slug}`, JSON.stringify(allNames)) } catch {}
  }

  const openNew = () => {
    setForm({ ...emptyForm, sortOrder: services.length + 1 })
    setPriceStr('0'); setDurationStr('30'); setCleanupStr('0'); setBufferStr('0')
    setEditingId(null); setShowForm(true); setError('')
  }

  const openEdit = (s: Service) => {
    setForm({
      name: s.name,
      description: s.description || '',
      price: s.price,
      durationMinutes: s.durationMinutes,
      cleanupMinutes: s.cleanupMinutes || 0,
      bufferMinutes: s.bufferMinutes || 0,
      active: s.active,
      sortOrder: s.sortOrder,
    })
    setPriceStr(String(s.price)); setDurationStr(String(s.durationMinutes)); setCleanupStr(String(s.cleanupMinutes || 0)); setBufferStr(String(s.bufferMinutes || 0))
    setEditingId(s.id); setShowForm(true); setError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Il nome e obbligatorio'); return }
    // Parse string inputs to final numeric values
    const finalPrice = priceStr === '' ? 0 : parseFloat(priceStr) || 0
    const finalDuration = durationStr === '' ? 5 : parseInt(durationStr) || 5
    const finalCleanup = cleanupStr === '' ? 0 : parseInt(cleanupStr) || 0
    const finalBuffer = bufferStr === '' ? 0 : parseInt(bufferStr) || 0
    const payload = { ...form, price: finalPrice, durationMinutes: finalDuration, cleanupMinutes: finalCleanup, bufferMinutes: finalBuffer }
    setSaving(true); setError('')
    try {
      const url = editingId ? `/api/services/${editingId}` : '/api/services'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Errore') }
      setShowForm(false); fetchServices()
      // Auto-hide the suggestion if it was used
      if (!editingId && form.name) {
        const isSuggestion = suggestions.some(s => s.name === form.name)
        if (isSuggestion && !hiddenSuggestions.includes(form.name)) {
          dismissSuggestion(form.name)
        }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Errore nel salvataggio') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo servizio?')) return
    try { const res = await fetch(`/api/services/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); fetchServices() }
    catch { setError("Errore nell'eliminazione") }
  }

  const toggleActive = async (s: Service) => {
    try {
      await fetch(`/api/services/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, active: !s.active }) })
      fetchServices()
    } catch { /* silent */ }
  }

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" /></div>)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Servizi</h1>
          <p className="text-stone-500 text-sm mt-1">{services.length} servizi configurati</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-3 py-2.5 sm:px-4 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuovo Servizio</span>
        </button>
      </div>

      {error && (<div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>)}

      {/* Quick suggestion badges */}
      {(() => {
        const visibleSuggestions = suggestions.filter(s => !hiddenSuggestions.includes(s.name))
        if (visibleSuggestions.length === 0 || showForm) return null
        return (
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-stone-500" />
                <span className="text-sm font-medium text-stone-700">Suggerimenti rapidi</span>
                <span className="text-xs text-stone-400">— clicca per precompilare</span>
              </div>
              <button
                onClick={dismissAllSuggestions}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                title="Nascondi suggerimenti"
              >
                <X className="w-3.5 h-3.5" />
                Nascondi
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setForm({ ...emptyForm, name: s.name, durationMinutes: s.durationMinutes, sortOrder: services.length + 1 })
                    setDurationStr(String(s.durationMinutes))
                    setPriceStr('0'); setCleanupStr('0'); setBufferStr('0')
                    setEditingId(null)
                    setShowForm(true)
                    setError('')
                  }}
                  className="group inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm font-medium hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {s.name} <span className="text-stone-400 group-hover:text-stone-300">({s.durationMinutes} min)</span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Services list */}
      <div className="space-y-2">
        {services.map(service => {
          const totalMin = service.durationMinutes + (service.cleanupMinutes || 0)
          return (
            <div key={service.id} className={`bg-white rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-opacity ${!service.active ? 'opacity-50' : ''}`}>
              <GripVertical className="w-4 h-4 text-stone-300 shrink-0 hidden sm:block" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-900">{service.name}</span>
                  {!service.active && (<span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-500 font-medium">Inattivo</span>)}
                </div>
                {service.description && (<p className="text-sm text-stone-500 truncate">{service.description}</p>)}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                <div className="text-left sm:text-right">
                  <div className="flex items-center gap-1 text-sm font-medium text-stone-900"><Euro className="w-3.5 h-3.5" />{service.price.toFixed(2)}</div>
                  <div className="flex items-center gap-1 text-xs text-stone-500">
                    <Clock className="w-3 h-3" />{service.durationMinutes} min
                    {(service.cleanupMinutes || 0) > 0 && (
                      <span className="text-stone-400 sm:hidden"> + {service.cleanupMinutes} min pulizia</span>
                    )}
                    {(service.cleanupMinutes || 0) > 0 && (
                      <span className="text-stone-400 hidden sm:inline">+ <Timer className="w-2.5 h-2.5 inline" />{service.cleanupMinutes} min pulizia = {totalMin} min</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(service)} className={`relative w-10 h-6 rounded-full transition-colors ${service.active ? 'bg-stone-900' : 'bg-stone-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${service.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(service.id)} className="p-2 rounded-lg hover:bg-red-50 text-stone-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )
        })}
        {services.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="text-lg mb-2">Nessun servizio configurato</p>
            <p className="text-sm">Crea il tuo primo servizio per iniziare</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-stone-900">{editingId ? 'Modifica Servizio' : 'Nuovo Servizio'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-stone-100"><X className="w-5 h-5" /></button>
              </div>

              {error && (<div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>)}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Nome *</label>
                  <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="es. Servizio Standard" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Descrizione</label>
                  <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Descrizione opzionale del servizio..." rows={2} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Prezzo (EUR) *</label>
                    <input type="text" inputMode="decimal" value={priceStr} onChange={e => { setPriceStr(e.target.value); setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 })) }} placeholder="0.00" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Durata (min) *</label>
                    <input type="text" inputMode="numeric" value={durationStr} onChange={e => { setDurationStr(e.target.value); setForm(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 30 })) }} placeholder="30" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-1.5">
                    <Timer className="w-4 h-4" />
                    Tempo pulizia/organizzazione (min)
                  </label>
                  <input type="text" inputMode="numeric" value={cleanupStr} onChange={e => { setCleanupStr(e.target.value); setForm(prev => ({ ...prev, cleanupMinutes: parseInt(e.target.value) || 0 })) }} placeholder="0" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
                  <p className="text-xs text-stone-400 mt-1">Tempo aggiuntivo per pulizia/organizzazione dopo il servizio. Visibile al cliente nel riepilogo.</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-1.5">
                    <Clock className="w-4 h-4" />
                    Buffer di pausa (min)
                  </label>
                  <input type="text" inputMode="numeric" value={bufferStr} onChange={e => { setBufferStr(e.target.value); setForm(prev => ({ ...prev, bufferMinutes: parseInt(e.target.value) || 0 })) }} placeholder="0" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
                  <p className="text-xs text-stone-400 mt-1">Tempo di riposo tra un cliente e il successivo. Non visibile al cliente, ma blocca lo slot nel calendario.</p>
                  {(parseInt(bufferStr) || 0) > 0 && (
                    <p className="text-xs text-stone-600 mt-1 font-medium">
                      Durata slot: {parseInt(durationStr) || 30} + {parseInt(cleanupStr) || 0} + {parseInt(bufferStr) || 0} = {(parseInt(durationStr) || 30) + (parseInt(cleanupStr) || 0) + (parseInt(bufferStr) || 0)} min
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))} className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${form.active ? 'bg-stone-900' : 'bg-stone-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${form.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-stone-700">Attivo</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors">Annulla</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors">{saving ? 'Salvataggio...' : 'Salva'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
