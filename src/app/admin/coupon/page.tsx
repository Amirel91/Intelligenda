'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/admin/layout'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Tag,
  Search,
} from 'lucide-react'

interface Coupon {
  id: string
  code: string
  discountAmount: number
  maxUses: number
  usedCount: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

export default function CouponAdminPage() {
  const { loading: authLoading } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [showCreate, setShowCreate] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('100')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/coupon/admin')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCoupons(Array.isArray(data) ? data : [])
    } catch {
      setError('Errore nel caricamento dei coupon')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) fetchCoupons()
  }, [authLoading, fetchCoupons])

  const handleCreate = async () => {
    setCreateError('')
    if (!newCode.trim()) { setCreateError('Inserisci un codice'); return }
    const discount = parseFloat(newDiscount)
    if (isNaN(discount) || discount <= 0) { setCreateError('Inserisci un importo valido'); return }

    setCreating(true)
    try {
      const res = await fetch('/api/coupon/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim(),
          discountAmount: discount,
          maxUses: parseInt(newMaxUses) || 100,
          expiresAt: newExpiresAt || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Errore nella creazione')
        return
      }
      setCoupons(prev => [data, ...prev])
      setShowCreate(false)
      setNewCode('')
      setNewDiscount('')
      setNewMaxUses('100')
      setNewExpiresAt('')
    } catch {
      setCreateError('Errore di connessione')
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/coupon/admin/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      if (res.ok) {
        setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
      }
    } catch { /* silent */ }
  }

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm(`Eliminare il coupon "${coupon.code}"?`)) return
    try {
      const res = await fetch(`/api/coupon/admin/${coupon.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCoupons(prev => prev.filter(c => c.id !== coupon.id))
      } else {
        const data = await res.json()
        alert(data.error || 'Errore')
      }
    } catch { /* silent */ }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 dark:border-stone-600 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold dark:text-stone-100 text-stone-900">Codici Sconto</h1>
          <p className="text-sm dark:text-stone-400 text-stone-500 mt-1">Crea e gestisci i codici sconto per i tuoi clienti</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl dark:bg-stone-100 bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuovo Coupon
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl dark:bg-red-950/50 bg-red-50 border dark:border-red-800 border-red-200 dark:text-red-400 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {coupons.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full dark:bg-stone-800 bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 dark:text-stone-500 text-stone-400" />
          </div>
          <p className="dark:text-stone-400 text-stone-500 text-sm">Nessun codice sconto creato</p>
          <p className="dark:text-stone-500 text-stone-400 text-xs mt-1">Crea il tuo primo coupon per offrire sconti ai clienti</p>
        </div>
      )}

      {/* Coupon list */}
      <div className="space-y-3">
        {coupons.map(coupon => {
          const usagePercent = coupon.maxUses > 0 ? Math.round((coupon.usedCount / coupon.maxUses) * 100) : 0
          const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date()

          return (
            <motion.div
              key={coupon.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border-2 transition-all ${
                coupon.isActive
                  ? 'dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white'
                  : 'dark:border-stone-800 border-stone-100 dark:bg-stone-800/50 bg-stone-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold dark:text-stone-100 text-stone-900 text-lg tracking-wider">{coupon.code}</span>
                    {!coupon.isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full dark:bg-stone-700 bg-stone-200 dark:text-stone-400 text-stone-500 font-medium">Disattivo</span>
                    )}
                    {isExpired && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full dark:bg-red-900/50 bg-red-100 dark:text-red-400 text-red-600 font-medium">Scaduto</span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="dark:text-emerald-400 text-emerald-600 font-semibold">-€{coupon.discountAmount.toFixed(2)}</span>
                    <span className="dark:text-stone-500 text-stone-400">|</span>
                    <span className="dark:text-stone-400 text-stone-500">
                      {coupon.usedCount}/{coupon.maxUses} utilizzi
                    </span>
                    {coupon.expiresAt && (
                      <>
                        <span className="dark:text-stone-500 text-stone-400">|</span>
                        <span className="dark:text-stone-400 text-stone-500">
                          Scade: {new Date(coupon.expiresAt).toLocaleDateString('it-IT')}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Usage bar */}
                  <div className="mt-2 h-1.5 rounded-full dark:bg-stone-800 bg-stone-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usagePercent >= 80 ? 'bg-red-500' : usagePercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <button
                    onClick={() => toggleActive(coupon)}
                    className="p-2 rounded-lg dark:hover:bg-stone-700 hover:bg-stone-100 transition-colors"
                    title={coupon.isActive ? 'Disattiva' : 'Attiva'}
                  >
                    {coupon.isActive ? (
                      <ToggleRight className="w-5 h-5 dark:text-emerald-400 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 dark:text-stone-500 text-stone-400" />
                    )}
                  </button>
                  {coupon.usedCount === 0 && (
                    <button
                      onClick={() => deleteCoupon(coupon)}
                      className="p-2 rounded-lg dark:hover:bg-red-950/50 hover:bg-red-50 dark:text-stone-500 text-stone-400 hover:text-red-600 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="dark:bg-stone-900 bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold dark:text-stone-100 text-stone-900">Nuovo Codice Sconto</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg dark:hover:bg-stone-700 hover:bg-stone-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {createError && (
                  <div className="p-3 rounded-lg dark:bg-red-950/50 bg-red-50 border dark:border-red-800 border-red-200 dark:text-red-400 text-red-700 text-sm">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium dark:text-stone-300 text-stone-700 mb-1.5">Codice</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    placeholder="SCONTO10"
                    className="w-full px-4 py-3 rounded-xl border-2 dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white dark:text-stone-100 text-stone-900 dark:placeholder-stone-500 placeholder-stone-400 outline-none transition-colors uppercase font-mono tracking-wider dark:focus:border-stone-100 focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-stone-300 text-stone-700 mb-1.5">Sconto (EUR)</label>
                  <input
                    type="number"
                    value={newDiscount}
                    onChange={e => setNewDiscount(e.target.value)}
                    placeholder="10.00"
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border-2 dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white dark:text-stone-100 text-stone-900 dark:placeholder-stone-500 placeholder-stone-400 outline-none transition-colors dark:focus:border-stone-100 focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-stone-300 text-stone-700 mb-1.5">Utilizzi massimi</label>
                  <input
                    type="number"
                    value={newMaxUses}
                    onChange={e => setNewMaxUses(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 rounded-xl border-2 dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white dark:text-stone-100 text-stone-900 dark:placeholder-stone-500 placeholder-stone-400 outline-none transition-colors dark:focus:border-stone-100 focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-stone-300 text-stone-700 mb-1.5">
                    Scadenza <span className="dark:text-stone-500 text-stone-400 font-normal">(opzionale)</span>
                  </label>
                  <input
                    type="date"
                    value={newExpiresAt}
                    onChange={e => setNewExpiresAt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 dark:border-stone-700 border-stone-200 dark:bg-stone-900 bg-white dark:text-stone-100 text-stone-900 dark:placeholder-stone-500 placeholder-stone-400 outline-none transition-colors dark:focus:border-stone-100 focus:border-stone-900"
                  />
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating || !newCode.trim() || !newDiscount}
                  className="w-full py-3 rounded-xl dark:bg-stone-100 bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creazione...' : 'Crea Coupon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
