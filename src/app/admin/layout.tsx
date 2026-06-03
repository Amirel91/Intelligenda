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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full" />
      </div>
    )
  }

  // Public pages render without sidebar
  if (isPublicPage) return <>{children}</>

  // Not authenticated
  if (!username) return null

  return (
    <AuthContext.Provider value={{ username, loading: false, shopName, plan, trialDays, blocked }}>
      <div className="min-h-screen bg-stone-50 flex">

        {/* ---- Mobile overlay ---- */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ---- Sidebar ---- */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-stone-200/80 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-stone-100">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
              <Image src="/admin-icon.png" alt="" width={28} height={28} className="shrink-0 rounded-lg" />
              <span className="text-sm font-semibold text-stone-900 truncate">{shopName || 'IntelliGenda'}</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-stone-100 lg:hidden">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Navigation sections */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
            {sections.map(section => (
              <div key={section.title}>
                <p className="px-2.5 mb-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map(item => (
                    <SidebarLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isActive={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                      onClick={() => setSidebarOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-stone-100 p-3 space-y-0.5">
            {settingsItems.map(item => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                onClick={() => setSidebarOpen(false)}
                badge={item.href === '/admin/piano' ? plan : undefined}
              />
            ))}

            {/* PWA install */}
            {canInstallPWA && !isIOSSafari && (
              <button
                onClick={promptPWAInstall}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-stone-900 bg-stone-900 text-white hover:bg-stone-800 transition-colors mt-1"
              >
                <Download className="w-4 h-4" />
                <span>Installa App</span>
              </button>
            )}
            {canInstallPWA && isIOSSafari && !showIOSHint && (
              <button
                onClick={() => setShowIOSHint(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors mt-1"
              >
                <Download className="w-4 h-4" />
                <span>Installa App</span>
              </button>
            )}
            {canInstallPWA && isIOSSafari && showIOSHint && (
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-800 space-y-1 mt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">Installa IntelliGenda</span>
                  <button onClick={() => setShowIOSHint(false)} className="p-0.5 rounded hover:bg-blue-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <ol className="space-y-0.5 list-decimal list-inside text-blue-700">
                  <li>Tocca <strong>Condividi</strong> in basso</li>
                  <li>Seleziona <strong>Aggiungi a Home</strong></li>
                  <li>Conferma con <strong>Aggiungi</strong></li>
                </ol>
              </div>
            )}

            {/* Divider */}
            <div className="!mt-2 pt-2 border-t border-stone-100 space-y-0.5">
              <Link href="/" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                <Home className="w-4 h-4" />
                <span>Vai al sito</span>
              </Link>
              <a
                href={`mailto:support@intelligenda.it?subject=${encodeURIComponent(`Assistenza - ${shopName || 'Attivita'}`)}`}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Assistenza</span>
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Esci</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ---- Main content ---- */}
        <div className="flex-1 min-w-0">
          {/* Mobile header */}
          <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-stone-200/80 h-14 flex items-center px-4 gap-3 pt-[max(0,env(safe-area-inset-top))]">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1 rounded-lg hover:bg-stone-100">
              <Menu className="w-5 h-5 text-stone-600" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{getPageTitle()}</p>
            </div>
            {pathname !== '/admin/prenota' && (
              <Link href="/admin/prenota" className="p-1.5 -mr-1 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors">
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
