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
  Zap,
  Activity,
  Crown,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PLANS, PAID_PLANS } from '@/lib/plans'

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
  plan: string
  configPlanExpiresAt: string | null
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
  bookingsLast30Days: number
  monthlyRevenue: number
  payingTenants?: number
  couponTotalUsed: number
  couponCount: number
}

// ==================== SUBSCRIPTION BADGE ====================

const SUBSCRIPTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trial:      { label: 'Prova',       color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/50' },
  active:     { label: 'Attivo',      color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  cancelling: { label: 'In disdetta', color: 'text-orange-700 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-950/50' },
  suspended:  { label: 'Sospeso',     color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/50' },
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
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          {isExpired ? 'Scaduto il' : 'Rinnovo:'} {new Date(planEndDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
        </span>
      )}
    </div>
  )
}

// ==================== PLAN BADGE ====================

const PLAN_BADGE_STYLES: Record<string, { color: string; bg: string }> = {
  free:      { color: 'text-stone-600 dark:text-stone-400',      bg: 'bg-stone-100 dark:bg-stone-800' },
  trial:     { color: 'text-blue-700 dark:text-blue-400',        bg: 'bg-blue-50 dark:bg-blue-950/50' },
  starter:   { color: 'text-violet-700 dark:text-violet-400',    bg: 'bg-violet-50 dark:bg-violet-950/50' },
  pro:       { color: 'text-indigo-700 dark:text-indigo-400',    bg: 'bg-indigo-50 dark:bg-indigo-950/50' },
  business:  { color: 'text-amber-700 dark:text-amber-400',      bg: 'bg-amber-50 dark:bg-amber-950/50' },
  enterprise:{ color: 'text-emerald-700 dark:text-emerald-400',  bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  custom:    { color: 'text-rose-700 dark:text-rose-400',        bg: 'bg-rose-50 dark:bg-rose-950/50' },
}

function PlanBadge({ planId }: { planId: string }) {
  const tier = PLANS[planId] || PLANS.free
  const style = PLAN_BADGE_STYLES[planId] || PLAN_BADGE_STYLES.free
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${style.bg} ${style.color}`}>
      <Crown className="w-3 h-3" />
      {tier.name}
      {tier.price > 0 && <span className="font-normal opacity-70">{tier.price}€</span>}
    </span>
  )
}

// ==================== PLAN CHANGE MODAL ====================

const CHANGEABLE_PLANS = [PLANS.free, ...PAID_PLANS, PLANS.custom]

interface PlanModalState {
  open: boolean
  tenant: TenantRow | null
}

function PlanChangeModal({
  state,
  onClose,
  onConfirm,
  loading,
}: {
  state: PlanModalState
  onClose: () => void
  onConfirm: (tenantId: string, plan: string, endDate: string | null) => void
  loading: boolean
}) {
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [duration, setDuration] = useState<'permanent' | '1m' | '3m' | '6m' | '1y' | 'custom'>('permanent')
  const [customDate, setCustomDate] = useState('')

  useEffect(() => {
    if (state.open && state.tenant) {
      setSelectedPlan(state.tenant.plan || 'free')
      setDuration('permanent')
      setCustomDate('')
    }
  }, [state.open, state.tenant])

  if (!state.open || !state.tenant) return null

  const getEndDate = (): string | null => {
    if (duration === 'permanent') return null
    if (duration === 'custom') return customDate || null
    const now = new Date()
    const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[duration] || 0
    now.setMonth(now.getMonth() + months)
    return now.toISOString()
  }

  const handleSave = () => {
    onConfirm(state.tenant!.id, selectedPlan, getEndDate())
  }

  const isFree = selectedPlan === 'free'
  const endDate = getEndDate()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
              <Crown className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100">Cambia Piano</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">{state.tenant.businessName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan selector */}
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Piano</label>
          <div className="grid grid-cols-3 gap-2">
            {CHANGEABLE_PLANS.map(p => {
              const isSelected = selectedPlan === p.id
              const style = PLAN_BADGE_STYLES[p.id] || PLAN_BADGE_STYLES.free
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`px-2 py-2.5 rounded-xl border-2 text-center transition-all ${
                    isSelected
                      ? `${style.bg} ${style.color} border-current`
                      : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                  }`}
                >
                  <p className="text-xs font-semibold leading-tight">{p.name}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">
                    {p.isCustom ? 'Personalizzato' : p.price === 0 ? 'Gratuito' : `${p.price}€/mese`}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Duration selector */}
        {!isFree && (
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Durata</label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'permanent' as const, label: 'Per sempre' },
                { value: '1m' as const, label: '1 mese' },
                { value: '3m' as const, label: '3 mesi' },
                { value: '6m' as const, label: '6 mesi' },
                { value: '1y' as const, label: '1 anno' },
                { value: 'custom' as const, label: 'Data personalizzata' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    duration === opt.value
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {duration === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-stone-400"
              />
            )}
          </div>
        )}

        {/* Summary */}
        <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3 space-y-1">
          <p className="text-xs text-stone-500 dark:text-stone-400">Riepilogo</p>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
            {PLANS[selectedPlan]?.name} {isFree ? '(gratuito)' : `— ${PLANS[selectedPlan]?.price}€/mese`}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {isFree
              ? 'Il tenant passerà al piano gratuito'
              : endDate
                ? `Valido fino al ${new Date(endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`
                : 'Assegnazione permanente (nessuna scadenza)'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={loading || (duration === 'custom' && !customDate)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            {isFree ? 'Imposta Free' : 'Assegna Piano'}
          </button>
        </div>
      </div>
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
  const [planModal, setPlanModal] = useState<PlanModalState>({ open: false, tenant: null })
  const [planChanging, setPlanChanging] = useState(false)
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null)
  const [showEmailSettings, setShowEmailSettings] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailEnabled, setEmailEnabled] = useState('true')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)

  // ===== TAB STATE =====
  const [activeTab, setActiveTab] = useState<'dashboard' | 'coupon' | 'security' | 'churn'>('dashboard')

  // ===== PERFORMANCE LOG STATE =====
  const [perfLogs, setPerfLogs] = useState<any[]>([])

  const fetchPerfLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/superadmin/performance', { headers: authHeaders() })
      if (res.ok) setPerfLogs(await res.json())
    } catch { /* ignore */ }
  }, [])

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
    fetchPerfLogs()
  }, [fetchData, fetchEmailSettings, fetchMaintenance, fetchPerfLogs])

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

  // ===== PLAN CHANGE (SuperAdmin grant) =====

  const handlePlanChange = async (tenantId: string, plan: string, endDate: string | null) => {
    setPlanChanging(true)
    try {
      const headers = authHeaders()
      const body: Record<string, unknown> = { plan }
      if (plan === 'free') {
        body.subscriptionStatus = 'trial'
      } else {
        body.subscriptionStatus = 'active'
      }
      if (endDate) {
        body.planEndDate = endDate
      } else if (plan !== 'free') {
        // No expiry = permanent grant, explicitly null to clear any previous date
        body.planEndDate = null
      }

      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Errore')
        return
      }

      // Update local state
      setTenants(prev => prev.map(t => {
        if (t.id !== tenantId) return t
        return {
          ...t,
          plan,
          subscriptionStatus: body.subscriptionStatus as string,
          planEndDate: body.planEndDate as string | null,
        }
      }))
      setPlanModal({ open: false, tenant: null })
    } catch {
      alert('Errore di connessione')
    } finally {
      setPlanChanging(false)
    }
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
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-stone-600 border-t-stone-900 dark:border-t-stone-100 rounded-full" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button onClick={() => router.replace('/superadmin/login')} className="text-sm text-stone-500 dark:text-stone-400 underline">
            Torna al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      {/* ============ HEADER ============ */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IntelliGendaLogo size="lg" showText={false} className="text-stone-900 dark:text-stone-100" />
            <div>
              <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">SuperAdmin</h1>
              <p className="text-xs text-stone-400 dark:text-stone-500">IntelliGenda Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={fetchData}
              className="p-2 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              title="Aggiorna dati"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              title="Esci"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ============ MAINTENANCE MODE ============ */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 sm:p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">Modalità Manutenzione</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">{maintenanceMode ? 'Tutti i siti sono offline' : 'Tutti i siti sono attivi'}</p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={maintenanceLoading}
            className={`relative w-14 h-7 rounded-full transition-colors ${maintenanceMode ? 'bg-red-600' : 'bg-stone-300 dark:bg-stone-600'}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${maintenanceMode ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* ============ EMAIL SETTINGS (COLLAPSIBLE) ============ */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden mb-6">
          <button
            onClick={() => setShowEmailSettings(!showEmailSettings)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">Email di Benvenuto</p>
                <p className="text-xs text-stone-400 dark:text-stone-500">Personalizza il testo inviato ai nuovi iscritti</p>
              </div>
            </div>
            {showEmailSettings ? <ChevronUp className="w-5 h-5 text-stone-400 dark:text-stone-500" /> : <ChevronDown className="w-5 h-5 text-stone-400 dark:text-stone-500" />}
          </button>

          {showEmailSettings && (
            <div className="px-6 pb-6 border-t border-stone-100 dark:border-stone-800 pt-4 space-y-4">
              {/* Enable/Disable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Invio automatico</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Attiva o disattiva l&apos;invio della email di benvenuto</p>
                </div>
                <button
                  onClick={() => setEmailEnabled(emailEnabled === 'true' ? 'false' : 'true')}
                  className={`relative w-12 h-6 rounded-full transition-colors ${emailEnabled === 'true' ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-300 dark:bg-stone-600'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${emailEnabled === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Oggetto dell&apos;email</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Benvenuto su IntelliGenda — {attivita} e pronto!"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                />
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Variabili: {'{attivita}'}, {'{nome}'}</p>
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Corpo dell&apos;email (HTML)</label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder={`<h2>Ciao {nome}!</h2><p>Il tuo negozio <strong>{attivita}</strong> e pronto.</p><p>Accedi alla dashboard: <a href="{dashboard}">{url}/admin</a></p>`}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors font-mono"
                />
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Variabili: {'{nome}'}, {'{attivita}'}, {'{slug}'}, {'{dashboard}'}, {'{url}'}</p>
              </div>

              {/* Save button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveEmailSettings}
                  disabled={emailSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 transition-colors"
                >
                  {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {emailSaving ? 'Salvataggio...' : 'Salva impostazioni'}
                </button>
                {emailSaved && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Salvato!</span>
                )}
                {emailBody && (
                  <button
                    onClick={() => { setEmailSubject(''); setEmailBody(''); setEmailEnabled('true') }}
                    className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  >
                    Ripristina default
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============ TAB BAR ============ */}
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm text-stone-500 dark:text-stone-400">MRR Stimato</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.monthlyRevenue}€</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{stats.payingTenants ?? stats.activeTenants} abbonamenti paganti x 40€/mese</p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-stone-500 dark:text-stone-400">Prenotazioni (30gg)</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.bookingsLast30Days}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{stats.totalBookings} totali dalla piattaforma</p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm text-stone-500 dark:text-stone-400">Utilizzo Coupon</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.couponTotalUsed}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{stats.couponCount} coupon creati</p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-stone-500 dark:text-stone-400">Tenant Attivi</span>
                  </div>
                  <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.activeTenants}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                    <span className="text-emerald-600 dark:text-emerald-400">{stats.activeTenants} attivi</span> · <span className="text-orange-600 dark:text-orange-400">{stats.suspendedTenants} sospesi</span>
                  </p>
                </div>
              </div>
            )}

            {/* TENANTS TABLE */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
              {/* Search bar */}
              <div className="p-4 border-b border-stone-100 dark:border-stone-800">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca attività, slug, email..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Attività</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden md:table-cell">Titolare</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Sottodominio</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden sm:table-cell">Piano</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden lg:table-cell">Pren.</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden lg:table-cell">Abbonamento</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Stato</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden xl:table-cell">Utilizzo</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-stone-400 dark:text-stone-500">
                          {search ? 'Nessuna attività corrisponde alla ricerca' : 'Nessuna attività registrata'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map(tenant => (
                        <React.Fragment key={tenant.id}>
                          <tr className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium text-stone-900 dark:text-stone-100">{tenant.businessName}</p>
                                  <p className="text-xs text-stone-400 dark:text-stone-500 md:hidden">{tenant.ownerName}</p>
                                </div>
                                {tenant.cancelReason && (
                                  <button
                                    onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                                    className="p-1 rounded text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-colors"
                                    title="Motivo disdetta"
                                  >
                                    <MessageSquareOff className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <p className="text-stone-600 dark:text-stone-400">{tenant.ownerName}</p>
                              <p className="text-xs text-stone-400 dark:text-stone-500">{tenant.ownerEmail}</p>
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={`https://${tenant.slug}.intelligenda.it`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-mono text-xs"
                              >
                                {tenant.slug}.intelligenda.it
                              </a>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <PlanBadge planId={tenant.plan} />
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-400">
                                <CalendarCheck className="w-3.5 h-3.5" />
                                {tenant.bookingCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <SubscriptionBadge status={tenant.subscriptionStatus} planEndDate={tenant.planEndDate} />
                            </td>
                            <td className="px-4 py-3">
                              {tenant.active ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Attiva
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 text-xs font-medium">
                                  <Ban className="w-3 h-3" />
                                  Sospesa
                                </span>
                              )}
                            </td>
                            {/* Churn / Utilizzo column */}
                            <td className="px-4 py-3 hidden xl:table-cell">
                              {tenant.isAtRisk ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                                  <AlertTriangle className="w-3 h-3" /> Inattivo ({tenant.daysInactive}g)
                                </span>
                              ) : tenant.isWarning ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                                  <Clock className="w-3 h-3" /> {tenant.daysInactive}g
                                </span>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">{tenant.daysInactive === 0 ? 'Oggi' : `${tenant.daysInactive}g fa`}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {/* Change plan button */}
                                <button
                                  onClick={() => setPlanModal({ open: true, tenant })}
                                  className="p-2 rounded-lg text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors"
                                  title="Cambia piano"
                                >
                                  <Crown className="w-4 h-4" />
                                </button>
                                {/* Impersonate button */}
                                <button
                                  onClick={() => handleImpersonate(tenant)}
                                  disabled={actionLoading === `imp-${tenant.id}`}
                                  className="p-2 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
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
                                          ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50'
                                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
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
                                        className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
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
                            <tr className="bg-orange-50/50 dark:bg-orange-950/30">
                              <td colSpan={9} className="px-4 py-3">
                                <div className="flex items-start gap-3 ml-2">
                                  <MessageSquareOff className="w-4 h-4 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-orange-800 dark:text-orange-300">Motivo disdetta</p>
                                    <p className="text-xs text-orange-700 dark:text-orange-400">{tenant.cancelReason}</p>
                                    {tenant.cancelledAt && (
                                      <p className="text-xs text-orange-500 dark:text-orange-400">
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
              <div className="px-4 py-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-400 dark:text-stone-500">
                {filtered.length} di {tenants.length} attività
              </div>
            </div>

            {/* API PERFORMANCE LOG */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden mt-8">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                  </div>
                  <div>
                    <h2 className="font-medium text-stone-900 dark:text-stone-100">Performance API</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {perfLogs.length > 0
                        ? `Avg /api/slots/batch: ${(perfLogs.reduce((s: number, l: any) => s + l.responseTime, 0) / perfLogs.length).toFixed(0)}ms · ${perfLogs.length} chiamate`
                        : 'Monitoraggio cold start e latenza'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => fetchPerfLogs()}
                  className="p-2 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  title="Aggiorna log"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Endpoint</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Risposta</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden sm:table-cell">ConfigId</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden md:table-cell">Data/Ora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {perfLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-stone-400 dark:text-stone-500">
                          <Zap className="w-5 h-5 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                          <p>Nessun log disponibile. I dati appariranno dopo le prime chiamate API.</p>
                        </td>
                      </tr>
                    ) : (
                      perfLogs.slice(0, 50).map((log: any) => (
                        <tr key={log.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-stone-600 dark:text-stone-400">{log.endpoint}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              log.responseTime < 200
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                                : log.responseTime < 500
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                                : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                            }`}>
                              {log.responseTime}ms
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="font-mono text-xs text-stone-400 dark:text-stone-500">{log.configId?.slice(0, 8)}...</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-stone-400 dark:text-stone-500 text-xs">
                            {log.createdAt ? formatDateTime(log.createdAt) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {perfLogs.length > 0 && (
                <div className="px-4 py-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-400 dark:text-stone-500">
                  Ultime {Math.min(perfLogs.length, 50)} di {perfLogs.length} chiamate registrate
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ TAB: COUPON ============ */}
        {activeTab === 'coupon' && (
          <div className="space-y-6">
            {/* Create coupon form */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-medium text-stone-900 dark:text-stone-100">Crea Coupon</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">Genera un codice sconto per i nuovi iscritti</p>
                </div>
              </div>

              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Codice *</label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="VALTELLINA30"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Sconto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={couponForm.discountAmount}
                    onChange={e => setCouponForm(prev => ({ ...prev, discountAmount: e.target.value }))}
                    placeholder="10.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Giorni prova extra</label>
                  <input
                    type="number"
                    min="0"
                    value={couponForm.extraTrialDays}
                    onChange={e => setCouponForm(prev => ({ ...prev, extraTrialDays: e.target.value }))}
                    placeholder="30"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Scadenza</label>
                  <input
                    type="date"
                    value={couponForm.expiryDate}
                    onChange={e => setCouponForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    disabled={couponSaving || !couponForm.code}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 transition-colors"
                  >
                    {couponSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {couponSaving ? 'Creazione...' : 'Crea Coupon'}
                  </button>
                </div>
              </form>
            </div>

            {/* Coupons table */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100 dark:border-stone-800">
                <h2 className="font-medium text-stone-900 dark:text-stone-100">Coupon Esistenti</h2>
                <p className="text-xs text-stone-400 dark:text-stone-500">{coupons.length} coupon totali</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Codice</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden sm:table-cell">Sconto</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden sm:table-cell">Giorni prova</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Stato</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden md:table-cell">Usato da</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden lg:table-cell">Creato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-stone-400 dark:text-stone-500">
                          Nessun coupon creato
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon: any) => {
                        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) <= new Date()
                        const status = coupon.usedAt ? 'used' : isExpired ? 'expired' : 'active'
                        const statusConfig = {
                          active: { label: 'Attivo', bg: 'bg-emerald-50 dark:bg-emerald-950/50', color: 'text-emerald-700 dark:text-emerald-400' },
                          used: { label: 'Usato', bg: 'bg-stone-100 dark:bg-stone-800', color: 'text-stone-500 dark:text-stone-400' },
                          expired: { label: 'Scaduto', bg: 'bg-red-50 dark:bg-red-950/50', color: 'text-red-700 dark:text-red-400' },
                        }[status]
                        return (
                          <tr key={coupon.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono font-medium text-stone-900 dark:text-stone-100">{coupon.code}</span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-stone-600 dark:text-stone-400">
                              {coupon.discountAmount ? `${coupon.discountAmount}€` : '—'}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-stone-600 dark:text-stone-400">
                              {coupon.extraTrialDays ? `+${coupon.extraTrialDays}gg` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-stone-600 dark:text-stone-400">
                              {coupon.usedByTenantName || '—'}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-stone-400 dark:text-stone-500 text-xs">
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
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h2 className="font-medium text-stone-900 dark:text-stone-100">Log Bloccati</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{spamLogs.length} tentativi sospetti</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">IP</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden sm:table-cell">Path</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden md:table-cell">Data</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {spamLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-stone-400 dark:text-stone-500">
                          Nessun log di spam
                        </td>
                      </tr>
                    ) : (
                      spamLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-stone-900 dark:text-stone-100 text-xs">{log.ipAddress}</td>
                          <td className="px-4 py-3 hidden sm:table-cell text-stone-600 dark:text-stone-400 text-xs truncate max-w-48">{log.path}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-stone-400 dark:text-stone-500 text-xs">{formatDateTime(log.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleBanIP(log.ipAddress)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
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
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-medium text-stone-900 dark:text-stone-100">IP Bannati</h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{bannedIPs.length} IP bloccati</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800 text-left">
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">IP</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden sm:table-cell">Motivo</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden md:table-cell">Data</th>
                      <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 text-right">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {bannedIPs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-stone-400 dark:text-stone-500">
                          Nessun IP bannato
                        </td>
                      </tr>
                    ) : (
                      bannedIPs.map((banned: any) => (
                        <tr key={banned.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-stone-900 dark:text-stone-100 text-xs">{banned.ipAddress}</td>
                          <td className="px-4 py-3 hidden sm:table-cell text-stone-600 dark:text-stone-400 text-xs">{banned.reason}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-stone-400 dark:text-stone-500 text-xs">{formatDateTime(banned.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleUnbanIP(banned.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
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
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="font-medium text-stone-900 dark:text-stone-100">Clienti a Rischio</h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{churnData.length} tenant con inattività superiore a 7 giorni</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-800 text-left">
                    <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Attività</th>
                    <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden sm:table-cell">Sottodominio</th>
                    <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden md:table-cell">Ultima attività</th>
                    <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Giorni inattivo</th>
                    <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400 hidden lg:table-cell">Abbonamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {churnData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-stone-400 dark:text-stone-500">
                        Nessun cliente a rischio — tutti i tenant sono attivi!
                      </td>
                    </tr>
                  ) : (
                    churnData.map((tenant: any) => {
                      const daysInactive = tenant.daysInactive || 0
                      const riskLevel = daysInactive > 14
                        ? { label: 'Inattivo', bg: 'bg-red-50 dark:bg-red-950/50', color: 'text-red-700 dark:text-red-400' }
                        : { label: 'Attenzione', bg: 'bg-amber-50 dark:bg-amber-950/50', color: 'text-amber-700 dark:text-amber-400' }
                      return (
                        <tr key={tenant.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-stone-900 dark:text-stone-100">{tenant.businessName}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <a
                              href={`https://${tenant.slug}.intelligenda.it`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-mono text-xs"
                            >
                              {tenant.slug}.intelligenda.it
                            </a>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-stone-400 dark:text-stone-500 text-xs">
                            {tenant.lastActivity ? formatDateTime(tenant.lastActivity) : 'Mai'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-stone-900 dark:text-stone-100">{daysInactive}</span>
                              <span className="text-xs text-stone-400 dark:text-stone-500">gg</span>
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
            <div className="px-4 py-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-400 dark:text-stone-500">
              {churnData.length} tenant a rischio su {tenants.length} totali
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna al sito
          </Link>
        </div>
      </div>

      {/* Plan Change Modal */}
      <PlanChangeModal
        state={planModal}
        onClose={() => setPlanModal({ open: false, tenant: null })}
        onConfirm={handlePlanChange}
        loading={planChanging}
      />
    </div>
  )
}
