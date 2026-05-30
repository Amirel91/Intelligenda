'use client'

import { useState, useEffect } from 'react'
import { Check, AlertCircle, Users, Plus, Pencil, Trash2, X } from 'lucide-react'

interface Resource {
  id: string
  name: string
  active: boolean
  sortOrder: number
  _count: { bookings: number }
  services?: { id: string }[]
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

  useEffect(() => {
    fetchResources()
    fetchShopServices()
  }, [])

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
      fetchResources()
    } catch { alert('Errore di connessione') }
    finally { setDeletingResource(null) }
  }

  return (
    <div className="max-w-3xl pb-20 sm:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Postazioni e Collaboratori</h1>
        <p className="text-stone-500 text-sm mt-1">
          Gestisci le postazioni o i collaboratori della tua attivita. I clienti potranno prenotare
          in parallelo sulle postazioni disponibili.
        </p>
      </div>

      {/* Resource list */}
      <div className="space-y-3 mb-8">
        {resourcesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">Nessuna postazione configurata</p>
            <p className="text-stone-400 text-xs mt-1">Aggiungi la prima postazione qui sotto</p>
          </div>
        ) : (
          resources.map((res) => (
            <div
              key={res.id}
              className={`bg-white rounded-xl border transition-colors ${
                editingResource?.id === res.id
                  ? 'border-stone-900 shadow-lg ring-1 ring-stone-900/10'
                  : res.active
                    ? 'border-stone-200'
                    : 'border-stone-100 opacity-60'
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
                      className="px-3 py-1.5 rounded-lg border-2 border-stone-900 text-sm text-stone-900 outline-none w-48"
                      autoFocus
                    />
                  ) : (
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-stone-900 truncate block">{res.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {res._count.bookings > 0 && (
                          <span className="text-xs text-stone-400">{res._count.bookings} prenotaz.</span>
                        )}
                        {res.services && res.services.length > 0 ? (
                          <span className="text-xs text-stone-400">
                            {res.services.length} servizio{res.services.length > 1 ? 'i' : ''} abilitat{res.services.length === 1 ? 'o' : 'i'}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">Tutti i servizi</span>
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
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
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
                        className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
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
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-stone-500 bg-stone-100 hover:bg-stone-200'
                        }`}
                        title={res.active ? 'Disattiva' : 'Riattiva'}
                      >
                        {res.active ? 'ATTIVA' : 'OFF'}
                      </button>
                      <button
                        onClick={() => { setEditingResource(res); setEditName(res.name); setEditServiceIds(res.services?.map(s => s.id) || []) }}
                        className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
                        title="Modifica"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(res.id)}
                        disabled={deletingResource === res.id}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
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
                <div className="px-4 pb-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mt-3 mb-2">
                    Servizi abilitati per questo operatore
                  </p>
                  <div className="space-y-1">
                    {shopServices.map(svc => {
                      const isChecked = editServiceIds.includes(svc.id)
                      return (
                        <label
                          key={svc.id}
                          className={`flex items-center gap-2.5 text-sm cursor-pointer py-2 px-3 rounded-lg transition-colors ${
                            isChecked ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-50'
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
                                ? 'border-white bg-white checked:bg-stone-900'
                                : 'border-stone-300 checked:bg-stone-900'
                            } focus:ring-stone-500`}
                          />
                          <span className="truncate">{svc.name}</span>
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs text-stone-400 mt-2">
                    {editServiceIds.length === 0
                      ? 'Nessun servizio selezionato = il collaboratore potra svolgere tutti i servizi.'
                      : `${editServiceIds.length} servizio${editServiceIds.length > 1 ? 'i selezionati' : ' selezionato'}`
                    }
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new resource section */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-stone-500" />
          <h2 className="font-semibold text-stone-900">Nuova Postazione</h2>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newResourceName}
            onChange={(e) => setNewResourceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddResource()}
            placeholder="Nome postazione (es. Poltrona 2, Dott. Rossi...)"
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-stone-200 bg-white text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors"
          />
          <button
            onClick={handleAddResource}
            disabled={addingResource || !newResourceName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all"
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
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
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
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {svc.name}
                  </button>
                )
              })}
            </div>
            {newResourceServiceIds.length > 0 && (
              <p className="text-xs text-stone-400 mt-2">
                {newResourceServiceIds.length} servizio{newResourceServiceIds.length > 1 ? 'i selezionati' : ' selezionato'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
