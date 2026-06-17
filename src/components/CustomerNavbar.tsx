'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User, CalendarDays, LogIn, UserPlus, ClipboardList, LogOut, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useT } from '@/lib/tenant-i18n'

interface CustomerData {
  id: string
  nome: string
  telefono: string
  email: string
}

export function CustomerNavbar() {
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const t = useT()

  // Check session on mount
  useEffect(() => {
    fetch('/api/auth/customer/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.customer) {
          setCustomer(data.customer)
        }
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/customer/logout', { method: 'POST' })
      setCustomer(null)
      setMenuOpen(false)
      window.location.href = '/'
    } catch { /* silent */ }
  }

  // Don't render until auth is checked (prevents flash)
  if (!authChecked) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/60 dark:border-stone-700/60">
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        {/* Left — Logo */}
        <Link href="/" aria-label="Home" />

        {/* Right — ThemeToggle + User menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label={t('Menu utente')}
            >
              {customer ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-stone-900 dark:bg-stone-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white dark:text-stone-900">
                      {customer.nome?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300 max-w-[120px] truncate hidden sm:block">
                    {customer.nome?.split(' ')[0] || t('Profilo')}
                  </span>
                </>
              ) : (
                <User className="w-5 h-5 text-stone-500 dark:text-stone-400" />
              )}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <>
                {/* Backdrop on mobile */}
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 shadow-lg shadow-stone-200/40 dark:shadow-stone-950/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800">
                    {customer ? (
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{customer.nome}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{customer.email}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-stone-500 dark:text-stone-400">{t('Menu utente')}</p>
                    )}
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      href="/prenota"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                    >
                      <CalendarDays className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                      {t('Prenota un appuntamento')}
                    </Link>

                    {customer ? (
                      <>
                        <Link
                          href="/profilo"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                        >
                          <ClipboardList className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                          {t('I miei appuntamenti')}
                        </Link>
                        <div className="border-t border-stone-100 dark:border-stone-800 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            {t('Disconnettiti')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                        >
                          <LogIn className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                          {t('Accedi')}
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                        >
                          <UserPlus className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                          {t('Registrati')}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
