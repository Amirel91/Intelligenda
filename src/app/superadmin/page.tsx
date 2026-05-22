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
  // Billing
  subscriptionStatus: string | null
  planEndDate: string | null
  cancelReason: string | null
  cancelledAt: string | null
}

interface Stats {
  totalTenants: number
  activeTenants: number
  suspendedTenants: number
  totalBookings: number
  monthlyRevenue: number
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

  // ==================== FETCH DATA ====================

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

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  // ==================== HELPERS ====================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

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
        {/* ============ STATS CARDS ============ */}
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
              <p className="text-xs text-stone-400 mt-1">Gestite dall'intera piattaforma</p>
            </div>
          </div>
        )}

        {/* ============ TENANTS TABLE ============ */}
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
                  <th className="px-4 py-3 font-medium text-stone-500 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
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
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
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
                          <td colSpan={7} className="px-4 py-3">
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
