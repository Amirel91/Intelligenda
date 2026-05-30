'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, Store, Clock, Key, Check, AlertCircle, UtensilsCrossed, Users, Plus, Pencil, Trash2, X, ShieldAlert, Plane, Download, QrCode } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

interface BusinessConfig {
  id: string
  shopName: string
  shopDescription: string
  shopPhone?: string
  shopEmail?: string
  shopAddress?: string
  lunchBreakEnabled: boolean
  lunchBreakStart: string
  lunchBreakEnd: string
  minNoticeHours: number
  features: string[]
}

interface ClosedPeriod {
  id: string
  startDate: string
  endDate: string
  reason: string
}

interface WorkingHour {
  id: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  closed: boolean
}

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

const defaultHours: WorkingHour[] = Array.from({ length: 7 }, (_, i) => ({
  id: '',
  dayOfWeek: i + 1,
  openTime: i < 5 ? '09:00' : '09:00',
  closeTime: i < 5 ? '18:00' : '13:00',
  closed: i === 6,
}))

interface Resource {
  id: string
  name: string
  active: boolean
  sortOrder: number
  _count: { bookings: number }
  services?: { id: string }[]
}

const defaultConfig: BusinessConfig = {
  id: '',
  shopName: '',
  shopDescription: '',
  shopPhone: '',
  shopEmail: '',
  shopAddress: '',
  lunchBreakEnabled: false,
  lunchBreakStart: '12:30',
  lunchBreakEnd: '14:00',
  minNoticeHours: 1,
  features: [],
}

export default function AdminImpostazioni() {
  const [config, setConfig] = useState<BusinessConfig>(defaultConfig)
  const [hours, setHours] = useState<WorkingHour[]>(defaultHours)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'negozio' | 'orari' | 'postazioni' | 'password'>('negozio')

  // Resources state
  const [resources, setResources] = useState<Resource[]>([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [newResourceName, setNewResourceName] = useState('')
  const [newResourceServiceIds, setNewResourceServiceIds] = useState<string[]>([])
  const [addingResource, setAddingResource] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editName, setEditName] = useState('')
  const [editServiceIds, setEditServiceIds] = useState<string[]>([])
  const [savingResource, setSavingResource] = useState(false)
  const [deletingResource, setDeletingResource] = useState<string | null>(null)
  const [shopServices, setShopServices] = useState<{ id: string; name: string }[]>([])

  // Closed Periods state
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([])
  const [newPeriod, setNewPeriod] = useState({ startDate: '', endDate: '', reason: '' })
  const [periodError, setPeriodError] = useState('')
  const [addingPeriod, setAddingPeriod] = useState(false)

  useEffect(() => {
    let configLoaded = false
    let hoursLoaded = false
    const checkDone = () => { if (configLoaded && hoursLoaded) setLoading(false) }

    fetch('/api/config')
      .then(r => { if (!r.ok) throw new Error('Errore API config'); return r.json() })
      .then(data => {
        if (data && typeof data === 'object') {
          setConfig({
            id: data.id || '',
            shopName: data.shopName || '',
            shopDescription: data.shopDescription || '',
            shopPhone: data.shopPhone || '',
            shopEmail: data.shopEmail || '',
            shopAddress: data.shopAddress || '',
            lunchBreakEnabled: data.lunchBreakEnabled || false,
            lunchBreakStart: data.lunchBreakStart || '12:30',
            lunchBreakEnd: data.lunchBreakEnd || '14:00',
            minNoticeHours: data.minNoticeHours ?? 1,
            features: data.features || [],
          })
        }
      })
      .catch(err => console.error('Config fetch error:', err))
      .finally(() => { configLoaded = true; checkDone() })

    fetch('/api/working-hours')
      .then(r => { if (!r.ok) throw new Error('Errore API working-hours'); return r.json() })
      .then(data => { if (Array.isArray(data) && data.length > 0) setHours(data) })
      .catch(err => console.error('Working hours fetch error:', err))
      .finally(() => { hoursLoaded = true; checkDone() })

    // Load closed periods
    fetch('/api/closed-periods')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setClosedPeriods(data) })
      .catch(err => console.error('Closed periods fetch error:', err))
  }, [])

  const fetchResources = async () => {
    setResourcesLoading(true)
    try {
      const [resRes, servRes] = await Promise.all([
        fetch('/api/resources'),
        fetch('/api/services?all=true'),
      ])
      if (resRes.ok) {
        const data = await resRes.json()
        setResources(Array.isArray(data) ? data : [])
      }
      if (servRes.ok) {
        const data = await servRes.json()
        setShopServices(Array.isArray(data) ? data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) : [])
      }
    } catch { /* silent */ }
    finally { setResourcesLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'postazioni') fetchResources()
  }, [activeTab])

  const saveConfig = async () => {
    setSaving(true); setSaved(false); setSaveError('')
    try {
      const configRes = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!configRes.ok) {
        const errData = await configRes.json()
        const msg = errData.debug
          ? `${errData.error} (${errData.debug})`
          : (errData.error || 'Errore nel salvataggio della configurazione')
        throw new Error(msg)
      }

      const hoursRes = await fetch('/api/working-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours),
      })
      if (!hoursRes.ok) {
        const errData = await hoursRes.json()
        throw new Error(errData.error || "Errore nel salvataggio degli orari")
      }

      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally { setSaving(false) }
  }

  const updateConfigField = (field: keyof BusinessConfig, value: string | boolean | number | string[]) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleChangePassword = async () => {
    setPasswordError(''); setPasswordSuccess('')
    if (passwords.new !== passwords.confirm) { setPasswordError('Le password non coincidono'); return }
    if (passwords.new.length < 6) { setPasswordError('La nuova password deve avere almeno 6 caratteri'); return }
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }) })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Errore') }
      setPasswordSuccess('Password aggiornata con successo'); setPasswords({ current: '', new: '', confirm: '' }); setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (err) { setPasswordError(err instanceof Error ? err.message : 'Errore') }
  }

  const updateHour = (index: number, field: keyof WorkingHour, value: string | boolean) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h))
  }

  // ============ RESOURCE HANDLERS ============

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
        alert(data.error || 'Errore nella creazione')
        return
      }
      setNewResourceName('')
      setNewResourceServiceIds([])
      fetchResources()
    } catch { alert('Errore di connessione') }
    finally { setAddingResource(false) }
  }

  const handleSaveResourceName = async (id: string) => {
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
        alert(data.error || 'Errore')
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

  // ---- Closed Periods CRUD ----
  const addClosedPeriod = async () => {
    setPeriodError('')
    if (!newPeriod.startDate || !newPeriod.endDate) { setPeriodError('Inserisci entrambe le date'); return }
    if (newPeriod.startDate > newPeriod.endDate) { setPeriodError('La data di fine deve essere successiva alla data di inizio'); return }
    setAddingPeriod(true)
    try {
      const res = await fetch('/api/closed-periods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPeriod) })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Errore nell'aggiunta del periodo") }
      const created = await res.json()
      setClosedPeriods(prev => [...prev, created].sort((a, b) => a.startDate.localeCompare(b.startDate)))
      setNewPeriod({ startDate: '', endDate: '', reason: '' })
    } catch (err) { setPeriodError(err instanceof Error ? err.message : 'Errore') }
    finally { setAddingPeriod(false) }
  }

  const deleteClosedPeriod = async (id: string) => {
    try {
      const res = await fetch(`/api/closed-periods?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setClosedPeriods(prev => prev.filter(p => p.id !== id))
    } catch { setPeriodError('Errore nella rimozione del periodo') }
  }

  function formatDateDisplay(dateStr: string): string {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  // ---- QR Code ----
  const qrRef = useRef<HTMLCanvasElement>(null)

  const getTenantSlug = useCallback((): string | null => {
    const match = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : null
  }, [])

  const getTenantUrl = useCallback((slug: string): string => {
    const isVercel = window.location.hostname.endsWith('.vercel.app')
    const base = window.location.origin
    return isVercel ? `${base}/t/${slug}` : `https://${slug}.intelligenda.it`
  }, [])

  const [tenantUrl, setTenantUrl] = useState('')
  useEffect(() => {
    const slug = getTenantSlug()
    if (slug) setTenantUrl(getTenantUrl(slug))
  }, [getTenantSlug, getTenantUrl])

  const handleDownloadQR = useCallback(() => {
    const canvas = qrRef.current
    if (!canvas) return
    // Create a high-res export with padding
    const padding = 32
    const size = canvas.width + padding * 2
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = size
    exportCanvas.height = size
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(canvas, padding, padding)
    const link = document.createElement('a')
    link.download = 'qrcode-intelligenda.png'
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }, [])

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" /></div>)
  }

  const tabs = [
    { id: 'negozio' as const, label: 'Negozio', icon: Store },
    { id: 'orari' as const, label: 'Orari', icon: Clock },
    { id: 'postazioni' as const, label: 'Postazioni', icon: Users },
    { id: 'password' as const, label: 'Password', icon: Key },
  ]

  return (
    <div className="max-w-3xl pb-20 sm:pb-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Impostazioni</h1>
          <p className="text-stone-500 text-sm mt-1">Configura il tuo negozio</p>
        </div>
        <div className="hidden sm:block">
          <button onClick={saveConfig} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all">
            {saved ? (<><Check className="w-4 h-4" />Salvato!</>) : (<><Save className="w-4 h-4" />{saving ? 'Salvataggio...' : 'Salva tutto'}</>)}
          </button>
        </div>
      </div>

      {saveError && (<div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-600 text-sm"><AlertCircle className="w-5 h-5 shrink-0" /><span>{saveError}</span></div>)}
      {saved && (<div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-600 text-sm"><Check className="w-5 h-5 shrink-0" /><span>Tutte le modifiche sono state salvate con successo.</span></div>)}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab: Negozio */}
      {activeTab === 'negozio' && (
        <>
          <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Nome del Negozio *</label>
              <input type="text" value={config.shopName} onChange={e => updateConfigField('shopName', e.target.value)} placeholder="Es: Il mio Negozio" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Descrizione</label>
              <textarea value={config.shopDescription} onChange={e => updateConfigField('shopDescription', e.target.value)} rows={3} placeholder="Descrivi la tua attivita..." className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors resize-none" />
              <p className="text-xs text-stone-400 mt-1">Appare sulla homepage del cliente</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Telefono</label>
                <input type="tel" value={config.shopPhone || ''} onChange={e => updateConfigField('shopPhone', e.target.value)} placeholder="+39 02 1234567" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                <input type="email" value={config.shopEmail || ''} onChange={e => updateConfigField('shopEmail', e.target.value)} placeholder="info@negozio.it" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Indirizzo</label>
              <input type="text" value={config.shopAddress || ''} onChange={e => updateConfigField('shopAddress', e.target.value)} placeholder="Via Roma 42, Milano" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
            </div>

            {/* Punti di Forza */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Punti di Forza
              </label>
              <p className="text-xs text-stone-400 mb-2">Fino a 3 punti che appariranno sulla homepage del cliente (es. Parcheggio, Wi-Fi, Aria condizionata)</p>
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <input
                    key={i}
                    type="text"
                    value={config.features?.[i] || ''}
                    onChange={e => {
                      const newFeatures = [...(config.features || ['', '', ''])]
                      newFeatures[i] = e.target.value
                      updateConfigField('features', newFeatures)
                    }}
                    placeholder={i === 0 ? 'Punto di forza 1' : i === 1 ? 'Punto di forza 2' : 'Punto di forza 3'}
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QR Code per la Vetrina */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 mt-6">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-5 h-5 text-stone-500" />
            <h2 className="font-semibold text-stone-900">Il tuo QR Code per la Vetrina</h2>
          </div>
          <p className="text-stone-500 text-sm mb-6">
            Mostra questo QR Code in vetrina per permettere ai clienti di prenotare
            direttamente dal loro smartphone.
          </p>

          <div className="flex flex-col items-center">
            <div className="bg-stone-50 rounded-2xl p-6 mb-4 border border-stone-100">
              {tenantUrl ? (
                <QRCodeCanvas
                  ref={qrRef}
                  value={tenantUrl}
                  size={200}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#1c1917"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-stone-400 text-sm">
                  Caricamento QR Code...
                </div>
              )}
            </div>

            <p className="text-xs text-stone-400 mb-4 break-all text-center max-w-xs">
              {tenantUrl || '—'}
            </p>

            <button
              onClick={handleDownloadQR}
              disabled={!tenantUrl}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Download className="w-4 h-4" />
              Scarica QR Code per la stampa
            </button>
          </div>
        </div>
        </>
      )}

      {/* Tab: Orari */}
      {activeTab === 'orari' && (
        <>
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5 text-stone-500" />
              <h2 className="font-semibold text-stone-900">Orari di Apertura</h2>
            </div>
            <div className="space-y-3">
              {hours.map((wh, i) => (
                <div key={wh.dayOfWeek} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 sm:py-0">
                  <div className="flex items-center justify-between sm:w-28 shrink-0">
                    <span className="text-sm font-medium text-stone-700">{DAY_NAMES[i]}</span>
                    <label className="flex items-center gap-2 cursor-pointer sm:hidden shrink-0">
                      <div onClick={() => updateHour(i, 'closed', !wh.closed)} className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${wh.closed ? 'bg-red-400' : 'bg-stone-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${wh.closed ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="hidden sm:flex items-center gap-2 cursor-pointer shrink-0">
                      <div onClick={() => updateHour(i, 'closed', !wh.closed)} className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${wh.closed ? 'bg-red-400' : 'bg-stone-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${wh.closed ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-xs text-stone-500 w-10">{wh.closed ? 'Chiuso' : 'Aperto'}</span>
                    </label>
                    {!wh.closed && (
                      <div className="flex items-center gap-2 text-sm">
                        <input type="time" value={wh.openTime} onChange={e => updateHour(i, 'openTime', e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors" />
                        <span className="text-stone-400">&mdash;</span>
                        <input type="time" value={wh.closeTime} onChange={e => updateHour(i, 'closeTime', e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <UtensilsCrossed className="w-5 h-5 text-stone-500" />
              <h2 className="font-semibold text-stone-900">Pausa Pranzo</h2>
            </div>
            <p className="text-stone-500 text-sm mb-4">I clienti non potranno prenotare durante l&apos;orario di pausa pranzo.</p>

            <div className="flex items-center gap-3 mb-4">
              <div onClick={() => updateConfigField('lunchBreakEnabled', !config.lunchBreakEnabled)} className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${config.lunchBreakEnabled ? 'bg-stone-900' : 'bg-stone-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${config.lunchBreakEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-stone-700">{config.lunchBreakEnabled ? 'Pausa pranzo attiva' : 'Pausa pranzo disattiva'}</span>
            </div>

            {config.lunchBreakEnabled && (
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Dalle</label>
                  <input type="time" value={config.lunchBreakStart} onChange={e => updateConfigField('lunchBreakStart', e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors" />
                </div>
                <span className="text-stone-400 mt-5">&mdash;</span>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Alle</label>
                  <input type="time" value={config.lunchBreakEnd} onChange={e => updateConfigField('lunchBreakEnd', e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors" />
                </div>
              </div>
            )}
          </div>

          {/* Preavviso Minimo */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-stone-500" />
              <h2 className="font-semibold text-stone-900">Preavviso Minimo di Prenotazione</h2>
            </div>
            <p className="text-stone-500 text-sm mb-4">
              I clienti non potranno prenotare slot orari piu vicini di <strong className="text-stone-700">{config.minNoticeHours} {config.minNoticeHours === 1 ? 'ora' : 'ore'}</strong> da adesso.
              Questo protegge dalle prenotazioni dell&apos;ultimo minuto.
            </p>
            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="number"
                min={0}
                max={48}
                value={config.minNoticeHours}
                onChange={e => updateConfigField('minNoticeHours', Math.max(0, Math.min(48, parseInt(e.target.value) || 0)))}
                className="w-24 px-3 py-2.5 rounded-xl border-2 border-stone-200 bg-white text-stone-900 text-center font-medium outline-none focus:border-stone-900 transition-colors"
              />
              <span className="text-sm text-stone-500">ore (max 48, 0 = disabilitato)</span>
            </div>
          </div>

          {/* Ferie e Chiusure Straordinarie */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="w-5 h-5 text-stone-500" />
              <h2 className="font-semibold text-stone-900">Ferie e Chiusure Straordinarie</h2>
            </div>
            <p className="text-stone-500 text-sm mb-5">
              Blocca interi giorni o settimane (es. ferie estive, ristrutturazione).
              I giorni selezionati saranno automaticamente chiusi al calendario del cliente.
            </p>

            {periodError && (<div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{periodError}</div>)}

            <div className="bg-stone-50 rounded-xl p-4 mb-5">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Nuovo Periodo</p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Data inizio</label>
                  <input type="date" value={newPeriod.startDate} onChange={e => setNewPeriod(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Data fine</label>
                  <input type="date" value={newPeriod.endDate} onChange={e => setNewPeriod(prev => ({ ...prev, endDate: e.target.value }))} min={newPeriod.startDate} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-900 outline-none focus:border-stone-900 transition-colors text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-600 mb-1">Motivo (opzionale)</label>
                  <input type="text" value={newPeriod.reason} onChange={e => setNewPeriod(prev => ({ ...prev, reason: e.target.value }))} placeholder="Es. Ferie estive" className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors text-sm" />
                </div>
                <button onClick={addClosedPeriod} disabled={addingPeriod || !newPeriod.startDate || !newPeriod.endDate} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0">
                  {addingPeriod ? (<div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />) : (<><Plus className="w-4 h-4" />Aggiungi</>)}
                </button>
              </div>
            </div>

            {closedPeriods.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-4">Nessun periodo di chiusura configurato.</p>
            ) : (
              <div className="space-y-2">
                {closedPeriods.map(period => (
                  <div key={period.id} className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-stone-50 border border-stone-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {formatDateDisplay(period.startDate)}{period.startDate !== period.endDate ? ` — ${formatDateDisplay(period.endDate)}` : ''}
                        </p>
                        {period.reason && (<p className="text-xs text-stone-500 truncate">{period.reason}</p>)}
                      </div>
                    </div>
                    <button onClick={() => deleteClosedPeriod(period.id)} className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Elimina periodo">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Postazioni / Collaboratori */}
      {activeTab === 'postazioni' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-stone-500" />
            <h2 className="font-semibold text-stone-900">Postazioni / Collaboratori</h2>
          </div>
          <p className="text-stone-500 text-sm mb-6">
            Gestisci le postazioni o i collaboratori della tua attivita. I clienti potranno prenotare
            in parallelo sulle postazioni disponibili.
          </p>

          {/* Resource list */}
          <div className="space-y-2 mb-6">
            {resourcesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
              </div>
            ) : resources.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-6">Nessuna postazione configurata</p>
            ) : (
              resources.map((res) => (
                <div
                  key={res.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    res.active
                      ? 'border-stone-200 bg-white'
                      : 'border-stone-100 bg-stone-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${res.active ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                    {editingResource?.id === res.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveResourceName(res.id)}
                        className="px-2 py-1 rounded-lg border-2 border-stone-900 text-sm text-stone-900 outline-none w-40"
                        autoFocus
                      />
                    ) : (
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-stone-900 truncate block">{res.name}</span>
                        {res._count.bookings > 0 && (
                          <span className="text-xs text-stone-400">{res._count.bookings} prenotaz. future</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingResource?.id === res.id ? (
                      <>
                        <button
                          onClick={() => handleSaveResourceName(res.id)}
                          disabled={savingResource || !editName.trim()}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                          title="Salva"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingResource(null); setEditName('') }}
                          className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
                          title="Annulla"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleResource(res)}
                          className={`p-1.5 rounded-lg text-xs font-medium px-2 transition-colors ${
                            res.active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={res.active ? 'Disattiva' : 'Riattiva'}
                        >
                          {res.active ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => { setEditingResource(res); setEditName(res.name); setEditServiceIds(res.services?.map(s => s.id) || []) }}
                          className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
                          title="Modifica nome"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(res.id)}
                          disabled={deletingResource === res.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* Service assignment checkboxes when editing */}
                  {editingResource?.id === res.id && (
                    <div className="mt-3 ml-9">
                      <p className="text-xs font-medium text-stone-500 mb-2">Servizi abilitati per questo operatore:</p>
                      <div className="space-y-1.5">
                        {shopServices.map(svc => {
                          const isChecked = editServiceIds.includes(svc.id)
                          return (
                            <label key={svc.id} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer py-1 px-2 rounded-lg hover:bg-stone-100 transition-colors">
                              <input type="checkbox" checked={isChecked} onChange={(e) => { setEditServiceIds(prev => e.target.checked ? [...prev, svc.id] : prev.filter(sid => sid !== svc.id)) }} className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500" />
                              <span className="truncate">{svc.name}</span>
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-xs text-stone-400 mt-1.5">{editServiceIds.length === 0 ? 'Nessun servizio selezionato = il collaboratore potra svolgere tutti i servizi.' : `${editServiceIds.length} servizio${editServiceIds.length > 1 ? 'i selezionati' : ' selezionato'}`}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add new resource */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newResourceName}
              onChange={(e) => setNewResourceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddResource()}
              placeholder="Nome postazione (es. Poltrona 2)"
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-stone-200 bg-white text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors"
            />
            <button
              onClick={handleAddResource}
              disabled={addingResource || !newResourceName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              Aggiungi
            </button>
          </div>

          {/* Service selection for new resource */}
          {shopServices.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-100">
              <p className="text-xs font-medium text-stone-500 mb-2">Servizi per la nuova postazione (opzionale):</p>
              <div className="flex flex-wrap gap-2">
                {shopServices.map(svc => {
                  const isChecked = newResourceServiceIds.includes(svc.id)
                  return (
                    <button key={svc.id} onClick={() => setNewResourceServiceIds(prev => isChecked ? prev.filter(sid => sid !== svc.id) : [...prev, svc.id])} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${isChecked ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                      {svc.name}
                    </button>
                  )
                })}
              </div>
              {newResourceServiceIds.length > 0 && <p className="text-xs text-stone-400 mt-2">{newResourceServiceIds.length} servizio{newResourceServiceIds.length > 1 ? 'i selezionati' : ' selezionato'}</p>}
            </div>
          )}
        </div>
      )}

      {/* Tab: Password */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Key className="w-5 h-5 text-stone-500" />
            <h2 className="font-semibold text-stone-900">Cambia Password</h2>
          </div>
          {passwordError && (<div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{passwordError}</div>)}
          {passwordSuccess && (<div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-600 text-sm">{passwordSuccess}</div>)}
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Password Attuale</label>
              <input type="password" value={passwords.current} onChange={e => setPasswords(prev => ({ ...prev, current: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Nuova Password</label>
              <input type="password" value={passwords.new} onChange={e => setPasswords(prev => ({ ...prev, new: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Conferma Nuova Password</label>
              <input type="password" value={passwords.confirm} onChange={e => setPasswords(prev => ({ ...prev, confirm: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 transition-colors" />
            </div>
            <button onClick={handleChangePassword} className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors">Aggiorna Password</button>
          </div>
        </div>
      )}

      {/* Sticky save button for mobile */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white/90 backdrop-blur-lg border-t border-stone-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-30">
        <button onClick={saveConfig} disabled={saving} className="w-full py-3.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {saved ? (<><Check className="w-4 h-4" />Salvato!</>) : (<><Save className="w-4 h-4" />{saving ? 'Salvataggio...' : 'Salva tutto'}</>)}
        </button>
      </div>
    </div>
  )
}
