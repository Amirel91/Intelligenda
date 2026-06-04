'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Plus,
  Download,
  Users,
  UserCog,
  LifeBuoy,
  Tag,
  CreditCard,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'
import { ThemeToggle } from '@/components/ThemeToggle'

interface AuthContextType {
  username: string | null
  loading: boolean
  shopName: string
  plan: string
  trialDays: number
  blocked: boolean
}

const AuthContext = createContext<AuthContextType>({ username: null, loading: true, shopName: '', plan: 'free', trialDays: 0, blocked: false })

export const useAuth = () => useContext(AuthContext)

// ---- Navigation sections ----
type NavItem = { href: string; label: string; icon: React.ElementType }

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Panoramica',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Gestione',
    items: [
      { href: '/admin/calendario', label: 'Calendario', icon: CalendarDays },
      { href: '/admin/prenota', label: 'Nuova Prenotazione', icon: Plus },
      { href: '/admin/servizi', label: 'Servizi', icon: Sparkles },
      { href: '/admin/postazioni', label: 'Postazioni', icon: UserCog },
      { href: '/admin/clienti', label: 'Clienti', icon: Users },
      { href: '/admin/coupon', label: 'Codici Sconto', icon: Tag },
    ],
  },
]

const settingsItems: NavItem[] = [
  { href: '/admin/impostazioni', label: 'Impostazioni', icon: Settings },
  { href: '/admin/piano', label: 'Piano', icon: CreditCard },
]

const navItems: NavItem[] = [...sections.flatMap(s => s.items), ...settingsItems]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [shopName, setShopName] = useState<string>('')
  const [plan, setPlan] = useState<string>('free')
  const [trialDays, setTrialDays] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const { canInstall: canInstallPWA, isIOS: isIOSSafari, promptInstall: promptPWAInstall, dismiss: dismissPWAInstall } = usePWAInstall()

  const isPublicPage = pathname === '/admin/login' || pathname === '/admin/forgot-password' || pathname === '/admin/reset-password'

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false)
      return
    }

    Promise.all([
      fetch('/api/auth/me').then(res => {
        if (!res.ok) {
          router.replace('/admin/login')
          return null
        }
        return res.json()
      }),
      fetch('/api/config').then(res => res.ok ? res.json() : null).catch(() => null),
      fetch('/api/billing/status').then(res => res.ok ? res.json() : null).catch(() => null),
    ])
      .then(([authData, configData, billingData]) => {
        if (authData?.username) setUsername(authData.username)
        if (configData?.shopName) setShopName(configData.shopName)
        if (configData?.plan) setPlan(configData.plan)
        if (billingData) {
          setTrialDays(billingData.trialDaysRemaining || 0)
          setBlocked(billingData.blocked || false)
        }
        setLoading(false)
      })
      .catch(() => {
        router.replace('/admin/login')
        setLoading(false)
      })
  }, [router, isPublicPage])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' })
    setUsername(null)
    router.push('/admin/login')
  }

  const getPageTitle = (): string => {
    const allItems = [...sections.flatMap(s => s.items), ...settingsItems]
    const match = allItems.find(n => pathname === n.href || (n.href !== '/admin/dashboard' && pathname.startsWith(n.href)))
    return match?.label || 'Gestionale'
  }

  // ---- Loading state ----
  if (loading && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-800">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-stone-600 border-t-stone-900 dark:border-t-stone-100 rounded-full" />
      </div>
    )
  }

  // Public pages render without sidebar
  if (isPublicPage) return <>{children}</>

  // Not authenticated
  if (!username) return null

  return (
    <AuthContext.Provider value={{ username, loading: false }}>
      <div className="min-h-screen bg-stone-100 dark:bg-stone-900 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ---- Sidebar ---- */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-700 flex flex-col transition-transform lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 flex items-center justify-between border-b border-stone-100 dark:border-stone-800">
            <Link href="/admin/dashboard">
              <IntelliGendaLogo size="md" showText={false} className="text-stone-900 dark:text-stone-100" textClassName="font-semibold" />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map(item => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-stone-100 dark:border-stone-800 space-y-1">
            {/* PWA Install Button */}
            {canInstallPWA && !isIOSSafari && (
              <button
                onClick={promptPWAInstall}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Installa App</span>
              </button>
            )}
            {canInstallPWA && isIOSSafari && !showIOSHint && (
              <button
                onClick={() => setShowIOSHint(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Installa App</span>
              </button>
            )}
            {canInstallPWA && isIOSSafari && showIOSHint && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">Installa IntelliGenda</span>
                  <button onClick={() => setShowIOSHint(false)} className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ol className="space-y-0.5 list-decimal list-inside text-blue-700 dark:text-blue-300">
                  <li>Tocca <strong>Condividi</strong> in basso</li>
                  <li>Seleziona <strong>Aggiungi a Home</strong></li>
                  <li>Conferma con <strong>Aggiungi</strong></li>
                </ol>
              </div>
            )}
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <Home className="w-5 h-5" />
              Vai al sito
            </Link>
            <a
              href={`mailto:support@intelligenda.it?subject=${encodeURIComponent(`Richiesta Assistenza - ${shopName || 'Attivita'}`)}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              <LifeBuoy className="w-5 h-5" />
              Hai bisogno di aiuto?
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Esci
            </button>
            {/* Theme Toggle */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <ThemeToggle />
              <span className="text-xs text-stone-400 dark:text-stone-500">Tema</span>
            </div>
          </div>
        </aside>

        {/* ---- Main content ---- */}
        <div className="flex-1 min-w-0">
          {/* Mobile header */}
          <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-stone-950/80 backdrop-blur-lg border-b border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
            >
              <Menu className="w-5 h-5 text-stone-600 dark:text-stone-400" />
            </button>
            <span className="flex-1 font-semibold text-stone-900 dark:text-stone-100 truncate">{navItems.find(n => pathname === n.href || (n.href !== '/admin/dashboard' && pathname.startsWith(n.href)))?.label || 'Gestionale'}</span>
            {pathname !== '/admin/prenota' && (
              <Link href="/admin/prenota" className="p-2 -mr-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                <Plus className="w-5 h-5" />
              </Link>
            )}
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-8 max-w-[1400px]">
            {/* Trial expiry warning */}
            {(plan === 'free' || plan === 'trial') && trialDays > 0 && !blocked && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800 flex-1">
                  <span className="font-medium">Prova gratuita:</span> {trialDays} giorni rimanenti.{' '}
                  <Link href="/admin/piano" className="underline font-medium hover:text-amber-900 transition-colors">
                    Scegli un piano
                  </Link>
                </p>
              </div>
            )}
            {/* Blocked warning */}
            {blocked && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-800 flex-1">
                  <span className="font-medium">Abbonamento scaduto.</span> Il tuo sito e bloccato.{' '}
                  <Link href="/admin/piano" className="underline font-medium hover:text-red-900 transition-colors">
                    Rinnova ora
                  </Link>
                </p>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  )
}

// ---- Reusable sidebar link ----
function SidebarLink({ href, icon: Icon, label, isActive, onClick, badge }: {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
  onClick?: () => void
  badge?: string
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors group ${
        isActive
          ? 'bg-stone-900 text-white'
          : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && !isActive && (
        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 group-hover:bg-stone-200 transition-colors">
          {badge}
        </span>
      )}
      {isActive && (
        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
      )}
    </Link>
  )
}
