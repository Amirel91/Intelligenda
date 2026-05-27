'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CreditCard,
  CalendarCheck,
  LogOut,
  Loader2,
  Ban,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowLeft,
  XCircle,
  Clock,
  MessageSquareOff,
  ChevronDown,
  ChevronUp,
  Mail,
  Save,
  Eye,
  Shield,
  Ticket,
  LayoutDashboard,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'

// ==================== AUTH HELPER ====================

const SA_TOKEN_KEY = 'superadmin_token'

function getSuperAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SA_TOKEN_KEY)
}

function clearSuperAdminToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SA_TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const token = getSuperAdminToken()
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

// ==================== TYPES ====================

interface TenantRow {
  id: string
  slug: string
  businessName: string
  ownerName: string
  ownerEmail: string
  active: boolean
  createdAt: string
  updatedAt: string
  bookingCount: number
  adminCount: number
  hasConfig: boolean
  subscriptionStatus: string | null
  planEndDate: string | null
  cancelReason: string | null
  cancelledAt: string | null
  // Churn monitoring
  lastActivity: string | null
  daysInactive: number
  isAtRisk: boolean
  isWarning: boolean
}

interface Stats {
  totalTenants: number
  activeTenants: number
  suspendedTenants: number
  totalBookings: number
  monthlyRevenue: number
  payingTenants?: number
}

// ==================== SUBSCRIPTION BADGE ====================

const SUBSCRIPTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trial:      { label: 'Prova',       color: 'text-blue-700',    bg: 'bg-blue-50' },
  active:     { label: 'Attivo',      color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelling: { label: 'In disdetta', color: 'text-orange-700',  bg: 'bg-orange-50' },
  suspended:  { label: 'Sospeso',     color: 'text-red-700',     bg: 'bg-red-50' },
}

function SubscriptionBadge({ status, planEndDate }: { status: string | null; planEndDate: string | null }) {
  const s = SUBSCRIPTION_LABELS[status || 'trial'] || SUBSCRIPTION_LABELS.trial

  const isExpired = planEndDate && new Date(planEndDate) <= new Date()
  const effectiveStatus = isExpired && status === 'cancelling' ? 'suspended' : (status || 'trial')
  const config = SUBSCRIPTION_LABELS[effectiveStatus] || s

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${config.bg} ${config.color}`}>
        <CreditCard className="w-3 h-3" />
        {config.label}
      </span>
      {planEndDate && (
        <span className="text-[10px] text-stone-400">
          {isExpired ? 'Scaduto il' : 'Rinnovo:'} {new Date(planEndDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
        </span>
      )}
    </div>
  )
}

// ==================== TAB CONFIG ====================

const tabs = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'coupon' as const, label: 'Coupon', icon: Ticket },
  { id: 'security' as const, label: 'Sicurezza', icon: Shield },
  { id: 'churn' as const, label: 'Clienti a Rischio', icon: AlertTriangle },
]

// ==================== FORMATTING HELPERS ====================

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ==================== PAGE ====================

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null)
  const [showEmailSettings, setShowEmailSettings] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailEnabled, setEmailEnabled] = useState('true')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)

  // ===== TAB STATE =====
  const [activeTab, setActiveTab] = useState<'dashboard' | 'coupon' | 'security' | 'churn'>('dashboard')

  // ===== MAINTENANCE MODE STATE =====
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)

  // ===== COUPON STATE =====
  const [coupons, setCoupons] = useState<any[]>([])
  const [couponForm, setCouponForm] = useState({ code: '', discountAmount: '', extraTrialDays: '', expiryDate: '' })
  const [couponSaving, setCouponSaving] = useState(false)

  // ===== SECURITY STATE =====
  const [spamLogs, setSpamLogs] = useState<any[]>([])
  const [bannedIPs, setBannedIPs] = useState<any[]>([])

  // ===== CHURN STATE =====
  const [churnData, setChurnData] = useState<any[]>([])

  // ==================== FETCH DATA ====================

  const fetchEmailSettings = useCallback(async () => {
    const headers = authHeaders()
    try {
      const res = await fetch('/api/superadmin/settings', { headers })
      if (res.ok) {
        const data = await res.json()
        setEmailSubject(data.welcome_email_subject || '')
        setEmailBody(data.welcome_email_body || '')
        setEmailEnabled(data.welcome_email_enabled || 'true')
      }
    } catch {
      // Ignore — use defaults
    }
  }, [])

  const fetchData = useCallback(async () => {
    const token = getSuperAdminToken()
    if (!token) {
      router.replace('/superadmin/login')
      return
    }

    const headers = authHeaders()
    console.log('[SuperAdmin] Fetching data, token length:', token.length)

    try {
      const [statsRes, tenantsRes] = await Promise.all([
        fetch('/api/superadmin/stats', { headers }),
        fetch('/api/superadmin/tenants', { headers }),
      ])

      console.log('[SuperAdmin] Stats status:', statsRes.status, 'Tenants status:', tenantsRes.status)

      if (statsRes.status === 401 || tenantsRes.status === 401) {
        console.log('[SuperAdmin] Unauthorized — clearing token')
        clearSuperAdminToken()
        router.replace('/superadmin/login')
        return
      }

      if (!statsRes.ok) {
        const errData = await statsRes.json().catch(() => null)
        const msg = errData?.error || `HTTP ${statsRes.status}`
        console.error('[SuperAdmin] Stats error:', msg)
        setError(`Errore caricamento statistiche: ${msg}`)
        return
      }

      if (!tenantsRes.ok) {
        const errData = await tenantsRes.json().catch(() => null)
        const msg = errData?.error || `HTTP ${tenantsRes.status}`
        console.error('[SuperAdmin] Tenants error:', msg)
        setError(`Errore caricamento tenant: ${msg}`)
        return
      }

      const statsData = await statsRes.json()
      const tenantsData = await tenantsRes.json()
      setStats(statsData)
      setTenants(tenantsData)
    } catch (err) {
      console.error('[SuperAdmin] Connection error:', err)
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }, [router])

  // ===== MAINTENANCE MODE =====

  const fetchMaintenance = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/maintenance', { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setMaintenanceMode(d.maintenance)
      }
    } catch { /* ignore */ }
  }, [])

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true)
    try {
      const headers = authHeaders()
      const res = await fetch('/api/superadmin/maintenance', { method: 'PUT', headers, body: JSON.stringify({ enabled: !maintenanceMode }) })
      if (res.ok) setMaintenanceMode(!maintenanceMode)
    } catch { /* ignore */ }
    finally { setMaintenanceLoading(false) }
  }

  // ===== COUPON =====

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/coupons', { headers: authHeaders() })
      if (res.ok) setCoupons(await res.json())
    } catch { /* ignore */ }
  }, [])

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setCouponSaving(true)
    try {
      const headers = authHeaders()
      const res = await fetch('/api/superadmin/coupons', {
        method: 'POST', headers,
        body: JSON.stringify({
          code: couponForm.code,
          discountAmount: couponForm.discountAmount || undefined,
          extraTrialDays: couponForm.extraTrialDays || undefined,
          expiryDate: couponForm.expiryDate || undefined,
        }),
      })
      if (res.ok) {
        setCouponForm({ code: '', discountAmount: '', extraTrialDays: '', expiryDate: '' })
        fetchCoupons()
      } else {
        const d = await res.json()
        alert(d.error || 'Errore')
      }
    } catch { alert('Errore di connessione') }
    finally { setCouponSaving(false) }
  }

  // ===== SECURITY =====

  const fetchSecurity = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/security', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setSpamLogs(data.spamLogs || [])
        setBannedIPs(data.bannedIPs || [])
      }
    } catch { /* ignore */ }
  }, [])

  const handleBanIP = async (ipAddress: string) => {
    if (!confirm(`Bannare permanentemente l'IP ${ipAddress}?`)) return
    try {
      const headers = authHeaders()
      const res = await fetch('/api/superadmin/security', {
        method: 'POST', headers,
        body: JSON.stringify({ ipAddress, reason: 'Bannato dal SuperAdmin' }),
      })
      if (res.ok) fetchSecurity()
      else { const d = await res.json(); alert(d.error || 'Errore') }
    } catch { alert('Errore') }
  }

  const handleUnbanIP = async (id: string) => {
    try {
      const headers = authHeaders()
      await fetch(`/api/superadmin/security?id=${id}`, { method: 'DELETE', headers })
      fetchSecurity()
    } catch { /* ignore */ }
  }

  // ===== CHURN =====

  const fetchChurn = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/churn', { headers: authHeaders() })
      if (res.ok) setChurnData(await res.json())
    } catch { /* ignore */ }
  }, [])

  // ===== IMPERSONATE =====

  const handleImpersonate = async (tenant: TenantRow) => {
    setActionLoading(`imp-${tenant.id}`)
    try {
      const headers = authHeaders()
      const res = await fetch('/api/superadmin/impersonate', {
        method: 'POST', headers,
        body: JSON.stringify({ tenantId: tenant.id }),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Errore'); return }
      const data = await res.json()
      const adminUrl = data.redirectUrl
      window.open(`${adminUrl}/impersonate?token=${encodeURIComponent(data.token)}&redirect=/admin`, '_blank')
    } catch { alert('Errore di connessione') }
    finally { setActionLoading(null) }
  }

  // ==================== EFFECTS ====================

  useEffect(() => {
    fetchData()
    fetchEmailSettings()
    fetchMaintenance()
  }, [fetchData, fetchEmailSettings, fetchMaintenance])

  useEffect(() => {
    if (activeTab === 'coupon') fetchCoupons()
    if (activeTab === 'security') fetchSecurity()
    if (activeTab === 'churn') fetchChurn()
  }, [activeTab, fetchCoupons, fetchSecurity, fetchChurn])

  // ==================== EMAIL SETTINGS ====================

  const handleSaveEmailSettings = async () => {
    setEmailSaving(true)
    setEmailSaved(false)
    try {
      const headers = authHeaders()
      await Promise.all([
        fetch('/api/superadmin/settings', { method: 'PUT', headers, body: JSON.stringify({ key: 'welcome_email_subject', value: emailSubject }) }),
        fetch('/api/superadmin/settings', { method: 'PUT', headers, body: JSON.stringify({ key: 'welcome_email_body', value: emailBody }) }),
        fetch('/api/superadmin/settings', { method: 'PUT', headers, body: JSON.stringify({ key: 'welcome_email_enabled', value: emailEnabled }) }),
      ])
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 3000)
    } catch {
      alert('Errore nel salvataggio')
    } finally {
      setEmailSaving(false)
    }
  }

  // ==================== ACTIONS ====================

  const handleToggleActive = async (tenant: TenantRow) => {
    setActionLoading(tenant.id)
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !tenant.active }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Errore')
        return
      }
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, active: !t.active } : t))
      setStats(prev => prev ? {
        ...prev,
        activeTenants: prev.activeTenants + (tenant.active ? -1 : 1),
        suspendedTenants: prev.suspendedTenants + (tenant.active ? 1 : -1),
        monthlyRevenue: prev.monthlyRevenue + (tenant.active ? -40 : 40),
      } : null)
    } catch {
      alert('Errore di connessione')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (tenant: TenantRow) => {
    if (!confirm(`Eliminare definitivamente "${tenant.businessName}" (${tenant.slug})?\n\nQuesta azione è irreversibile e cancellerà tutte le prenotazioni, servizi e dati associati.`)) {
      setConfirmDelete(null)
      return
    }
    setActionLoading(tenant.id)
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Errore')
        return
      }
      setTenants(prev => prev.filter(t => t.id !== tenant.id))
      setStats(prev => prev ? {
        ...prev,
        totalTenants: prev.totalTenants - 1,
        activeTenants: tenant.active ? prev.activeTenants - 1 : prev.activeTenants,
        suspendedTenants: tenant.active ? prev.suspendedTenants : prev.suspendedTenants - 1,
        monthlyRevenue: tenant.active ? prev.monthlyRevenue - 40 : prev.monthlyRevenue,
      } : null)
      setConfirmDelete(null)
    } catch {
      alert('Errore di connessione')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = () => {
    clearSuperAdminToken()
    router.replace('/superadmin/login')
  }

  // ==================== FILTER ====================

  const filtered = tenants.filter(t =>
    t.businessName.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerName.toLowerCase().includes(search.toLowerCase())
  )

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.replace('/superadmin/login')} className="text-sm text-stone-500 underline">
            Torna al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ============ HEADER ============ */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IntelliGendaLogo size="lg" showText={false} className="text-stone-900" />
            <div>
              <h1 className="text-lg font-bold text-stone-900 leading-tight">SuperAdmin</h1>
              <p className="text-xs text-stone-400">IntelliGenda Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
              title="Aggiorna dati"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              title="Esci"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ============ MAINTENANCE MODE ============ */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-stone-900">Modalità Manutenzione</p>
              <p className="text-xs text-stone-400">{maintenanceMode ? 'Tutti i siti sono offline' : 'Tutti i siti sono attivi'}</p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={maintenanceLoading}
            className={`relative w-14 h-7 rounded-full transition-colors ${maintenanceMode ? 'bg-red-600' : 'bg-stone-300'}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${maintenanceMode ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* ============ EMAIL SETTINGS (COLLAPSIBLE) ============ */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
          <button
            onClick={() => setShowEmailSettings(!showEmailSettings)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-stone-900">Email di Benvenuto</p>
                <p className="text-xs text-stone-400">Personalizza il testo inviato ai nuovi iscritti</p>
              </div>
            </div>
            {showEmailSettings ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
          </button>

          {showEmailSettings && (
            <div className="px-6 pb-6 border-t border-stone-100 pt-4 space-y-4">
              {/* Enable/Disable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">Invio automatico</p>
                  <p className="text-xs text-stone-400">Attiva o disattiva l&apos;invio della email di benvenuto</p>
                </div>
                <button
                  onClick={() => setEmailEnabled(emailEnabled === 'true' ? 'false' : 'true')}
                  className={`relative w-12 h-6 rounded-full transition-colors ${emailEnabled === 'true' ? 'bg-stone-900' : 'bg-stone-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${emailEnabled === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Oggetto dell&apos;email</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Benvenuto su IntelliGenda — {attivita} e pronto!"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
                />
                <p className="text-xs text-stone-400 mt-1">Variabili: {'{attivita}'}, {'{nome}'}</p>
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Corpo dell&apos;email (HTML)</label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder={`<h2>Ciao {nome}!</h2><p>Il tuo negozio <strong>{attivita}</strong> e pronto.</p><p>Accedi alla dashboard: <a href="{dashboard}">{url}/admin</a></p>`}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors font-mono"
                />
                <p className="text-xs text-stone-400 mt-1">Variabili: {'{nome}'}, {'{attivita}'}, {'{slug}'}, {'{dashboard}'}, {'{url}'}</p>
              </div>

              {/* Save button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveEmailSettings}
                  disabled={emailSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {emailSaving ? 'Salvataggio...' : 'Salva impostazioni'}
                </button>
                {emailSaved && (
                  <span className="text-sm text-emerald-600 font-medium">Salvato!</span>
                )}
                {emailBody && (
                  <button
                    onClick={() => { setEmailSubject(''); setEmailBody(''); setEmailEnabled('true') }}
                    className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    Ripristina default
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============ TAB BAR ============ */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============ TAB: DASHBOARD ============ */}
        {activeTab === 'dashboard' && (
          <>
            {/* STATS CARDS */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm text-stone-500">Attività iscritte</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-900">{stats.totalTenants}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    <span className="text-emerald-600">{stats.activeTenants} attive</span> · <span className="text-orange-600">{stats.suspendedTenants} sospese</span>
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-sm text-stone-500">Ricavi mensili stimati</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-900">{stats.monthlyRevenue}€</p>
                  <p className="text-xs text-stone-400 mt-1">{stats.payingTenants ?? stats.activeTenants} abbonamenti paganti x 40€/mese</p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-sm text-stone-500">Prenotazioni totali</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-900">{stats.totalBookings}</p>
                  <p className="text-xs text-stone-400 mt-1">Gestite dall&apos;intera piattaforma</p>
                </div>
              </div>
            )}

            {/* TENANTS TABLE */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              {/* Search bar */}
              <div className="p-4 border-b border-stone-100">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca attività, slug, email..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500">Attività</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Titolare</th>
                      <th className="px-4 py-3 font-medium text-stone-500">Sottodominio</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden sm:table-cell">Pren.</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Abbonamento</th>
                      <th className="px-4 py-3 font-medium text-stone-500">Stato</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden xl:table-cell">Utilizzo</th>
                      <th className="px-4 py-3 font-medium text-stone-500 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-stone-400">
                          {search ? 'Nessuna attività corrisponde alla ricerca' : 'Nessuna attività registrata'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map(tenant => (
                        <React.Fragment key={tenant.id}>
                          <tr className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium text-stone-900">{tenant.businessName}</p>
                                  <p className="text-xs text-stone-400 md:hidden">{tenant.ownerName}</p>
                                </div>
                                {tenant.cancelReason && (
                                  <button
                                    onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                                    className="p-1 rounded text-orange-500 hover:bg-orange-50 transition-colors"
                                    title="Motivo disdetta"
                                  >
                                    <MessageSquareOff className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <p className="text-stone-600">{tenant.ownerName}</p>
                              <p className="text-xs text-stone-400">{tenant.ownerEmail}</p>
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={`https://${tenant.slug}.intelligenda.it`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-stone-600 hover:text-stone-900 font-mono text-xs"
                              >
                                {tenant.slug}.intelligenda.it
                              </a>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="inline-flex items-center gap-1 text-stone-600">
                                <CalendarCheck className="w-3.5 h-3.5" />
                                {tenant.bookingCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <SubscriptionBadge status={tenant.subscriptionStatus} planEndDate={tenant.planEndDate} />
                            </td>
                            <td className="px-4 py-3">
                              {tenant.active ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Attiva
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                                  <Ban className="w-3 h-3" />
                                  Sospesa
                                </span>
                              )}
                            </td>
                            {/* Churn / Utilizzo column */}
                            <td className="px-4 py-3 hidden xl:table-cell">
                              {tenant.isAtRisk ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                  <AlertTriangle className="w-3 h-3" /> Inattivo ({tenant.daysInactive}g)
                                </span>
                              ) : tenant.isWarning ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                  <Clock className="w-3 h-3" /> {tenant.daysInactive}g
                                </span>
                              ) : (
                                <span className="text-xs text-emerald-600">{tenant.daysInactive === 0 ? 'Oggi' : `${tenant.daysInactive}g fa`}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {/* Impersonate button */}
                                <button
                                  onClick={() => handleImpersonate(tenant)}
                                  disabled={actionLoading === `imp-${tenant.id}`}
                                  className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors disabled:opacity-50"
                                  title="Accedi come Admin"
                                >
                                  {actionLoading === `imp-${tenant.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                </button>
                                {tenant.slug !== 'default' && (
                                  <>
                                    <button
                                      onClick={() => handleToggleActive(tenant)}
                                      disabled={actionLoading === tenant.id}
                                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                        tenant.active
                                          ? 'text-orange-600 hover:bg-orange-50'
                                          : 'text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                      title={tenant.active ? 'Sospendi' : 'Riattiva'}
                                    >
                                      {actionLoading === tenant.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : tenant.active ? (
                                        <Ban className="w-4 h-4" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                      )}
                                    </button>
                                    {confirmDelete === tenant.id ? (
                                      <button
                                        onClick={() => handleDelete(tenant)}
                                        disabled={actionLoading === tenant.id}
                                        className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                        title="Conferma eliminazione"
                                      >
                                        {actionLoading === tenant.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <AlertTriangle className="w-4 h-4" />
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmDelete(tenant.id)}
                                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                        title="Elimina"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Expanded row: cancel reason details */}
                          {expandedTenant === tenant.id && tenant.cancelReason && (
                            <tr className="bg-orange-50/50">
                              <td colSpan={8} className="px-4 py-3">
                                <div className="flex items-start gap-3 ml-2">
                                  <MessageSquareOff className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-orange-800">Motivo disdetta</p>
                                    <p className="text-xs text-orange-700">{tenant.cancelReason}</p>
                                    {tenant.cancelledAt && (
                                      <p className="text-xs text-orange-500">
                                        Data disdetta: {formatDate(tenant.cancelledAt)}
                                        {tenant.planEndDate && ` — Servizio attivo fino al: ${formatDate(tenant.planEndDate)}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-stone-100 text-xs text-stone-400">
                {filtered.length} di {tenants.length} attività
              </div>
            </div>
          </>
        )}

        {/* ============ TAB: COUPON ============ */}
        {activeTab === 'coupon' && (
          <div className="space-y-6">
            {/* Create coupon form */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-medium text-stone-900">Crea Coupon</h2>
                  <p className="text-xs text-stone-400">Genera un codice sconto per i nuovi iscritti</p>
                </div>
              </div>

              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Codice *</label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="VALTELLINA30"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Sconto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={couponForm.discountAmount}
                    onChange={e => setCouponForm(prev => ({ ...prev, discountAmount: e.target.value }))}
                    placeholder="10.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Giorni prova extra</label>
                  <input
                    type="number"
                    min="0"
                    value={couponForm.extraTrialDays}
                    onChange={e => setCouponForm(prev => ({ ...prev, extraTrialDays: e.target.value }))}
                    placeholder="30"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Scadenza</label>
                  <input
                    type="date"
                    value={couponForm.expiryDate}
                    onChange={e => setCouponForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    disabled={couponSaving || !couponForm.code}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {couponSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {couponSaving ? 'Creazione...' : 'Crea Coupon'}
                  </button>
                </div>
              </form>
            </div>

            {/* Coupons table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
                <h2 className="font-medium text-stone-900">Coupon Esistenti</h2>
                <p className="text-xs text-stone-400">{coupons.length} coupon totali</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500">Codice</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden sm:table-cell">Sconto</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden sm:table-cell">Giorni prova</th>
                      <th className="px-4 py-3 font-medium text-stone-500">Stato</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Usato da</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Creato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                          Nessun coupon creato
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon: any) => {
                        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) <= new Date()
                        const status = coupon.usedAt ? 'used' : isExpired ? 'expired' : 'active'
                        const statusConfig = {
                          active: { label: 'Attivo', bg: 'bg-emerald-50', color: 'text-emerald-700' },
                          used: { label: 'Usato', bg: 'bg-stone-100', color: 'text-stone-500' },
                          expired: { label: 'Scaduto', bg: 'bg-red-50', color: 'text-red-700' },
                        }[status]
                        return (
                          <tr key={coupon.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono font-medium text-stone-900">{coupon.code}</span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-stone-600">
                              {coupon.discountAmount ? `${coupon.discountAmount}€` : '—'}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-stone-600">
                              {coupon.extraTrialDays ? `+${coupon.extraTrialDays}gg` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-stone-600">
                              {coupon.usedByTenantName || '—'}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-stone-400 text-xs">
                              {formatDateTime(coupon.createdAt)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: SICUREZZA ============ */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Spam logs */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="font-medium text-stone-900">Log Bloccati</h2>
                    <p className="text-xs text-stone-400">{spamLogs.length} tentativi sospetti</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500">IP</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden sm:table-cell">Path</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Data</th>
                      <th className="px-4 py-3 font-medium text-stone-500 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {spamLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-stone-400">
                          Nessun log di spam
                        </td>
                      </tr>
                    ) : (
                      spamLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-stone-900 text-xs">{log.ipAddress}</td>
                          <td className="px-4 py-3 hidden sm:table-cell text-stone-600 text-xs truncate max-w-48">{log.path}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-stone-400 text-xs">{formatDateTime(log.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleBanIP(log.ipAddress)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                              <Ban className="w-3 h-3" />
                              Banna
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Banned IPs */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="font-medium text-stone-900">IP Bannati</h2>
                    <p className="text-xs text-stone-400">{bannedIPs.length} IP bloccati</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500">IP</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden sm:table-cell">Motivo</th>
                      <th className="px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Data</th>
                      <th className="px-4 py-3 font-medium text-stone-500 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {bannedIPs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-stone-400">
                          Nessun IP bannato
                        </td>
                      </tr>
                    ) : (
                      bannedIPs.map((banned: any) => (
                        <tr key={banned.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-stone-900 text-xs">{banned.ipAddress}</td>
                          <td className="px-4 py-3 hidden sm:table-cell text-stone-600 text-xs">{banned.reason}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-stone-400 text-xs">{formatDateTime(banned.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleUnbanIP(banned.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium hover:bg-stone-200 transition-colors"
                            >
                              <Wrench className="w-3 h-3" />
                              Rimuovi
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: CHURN MONITOR ============ */}
        {activeTab === 'churn' && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-medium text-stone-900">Clienti a Rischio</h2>
                  <p className="text-xs text-stone-400">{churnData.length} tenant con inattività superiore a 7 giorni</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left">
                    <th className="px-4 py-3 font-medium text-stone-500">Attività</th>
                    <th className="px-4 py-3 font-medium text-stone-500 hidden sm:table-cell">Sottodominio</th>
                    <th className="px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Ultima attività</th>
                    <th className="px-4 py-3 font-medium text-stone-500">Giorni inattivo</th>
                    <th className="px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Abbonamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {churnData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-stone-400">
                        Nessun cliente a rischio — tutti i tenant sono attivi!
                      </td>
                    </tr>
                  ) : (
                    churnData.map((tenant: any) => {
                      const daysInactive = tenant.daysInactive || 0
                      const riskLevel = daysInactive > 14
                        ? { label: 'Inattivo', bg: 'bg-red-50', color: 'text-red-700' }
                        : { label: 'Attenzione', bg: 'bg-amber-50', color: 'text-amber-700' }
                      return (
                        <tr key={tenant.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-stone-900">{tenant.businessName}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <a
                              href={`https://${tenant.slug}.intelligenda.it`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-600 hover:text-stone-900 font-mono text-xs"
                            >
                              {tenant.slug}.intelligenda.it
                            </a>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-stone-400 text-xs">
                            {tenant.lastActivity ? formatDateTime(tenant.lastActivity) : 'Mai'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-stone-900">{daysInactive}</span>
                              <span className="text-xs text-stone-400">gg</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${riskLevel.bg} ${riskLevel.color}`}>
                                {riskLevel.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <SubscriptionBadge status={tenant.subscriptionStatus} planEndDate={tenant.planEndDate} />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-stone-100 text-xs text-stone-400">
              {churnData.length} tenant a rischio su {tenants.length} totali
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna al sito
          </Link>
        </div>
      </div>
    </div>
  )
}
