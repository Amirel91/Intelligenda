'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
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
} from 'lucide-react'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'
import { ThemeToggle } from '@/components/ThemeToggle'

interface AuthContextType {
  username: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ username: null, loading: true })

export const useAuth = () => useContext(AuthContext)

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/admin/prenota', label: 'Nuova Prenotazione', icon: Plus },
  { href: '/admin/servizi', label: 'Servizi', icon: Sparkles },
  { href: '/admin/postazioni', label: 'Postazioni', icon: UserCog },
  { href: '/admin/clienti', label: 'Clienti', icon: Users },
  { href: '/admin/coupon', label: 'Codici Sconto', icon: Tag },
  { href: '/admin/impostazioni', label: 'Impostazioni', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [shopName, setShopName] = useState<string>('')
  const { canInstall: canInstallPWA, isIOS: isIOSSafari, promptInstall: promptPWAInstall, dismiss: dismissPWAInstall } = usePWAInstall()

  const isLoginPage = pathname === '/admin/login'
  const isPublicPage = pathname === '/admin/login' || pathname === '/admin/forgot-password' || pathname === '/admin/reset-password'

  useEffect(() => {
    // On public pages (login, forgot-password, reset-password), skip auth check entirely
    if (isPublicPage) {
      setLoading(false)
      return
    }

    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          // Not authenticated → redirect to login
          router.replace('/admin/login')
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data && data.username) {
          setUsername(data.username)
        }
        // Always stop loading, even if not authenticated
        setLoading(false)
      })
      .catch(() => {
        router.replace('/admin/login')
        setLoading(false)
      })

    // Fetch shop name for support link
    fetch('/api/config')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.shopName) setShopName(data.shopName) })
      .catch(() => {})
  }, [router, isPublicPage])

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' })
    setUsername(null)
    router.push('/admin/login')
  }

  // Show loading spinner only on non-public pages while checking auth
  if (loading && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-800">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-stone-600 border-t-stone-900 dark:border-t-stone-100 rounded-full" />
      </div>
    )
  }

  // On public pages, render children directly without sidebar
  if (isPublicPage) {
    return <>{children}</>
  }

  // Not authenticated and not on login page → show nothing (redirect will happen)
  if (!username) return null

  return (
    <AuthContext.Provider value={{ username, loading: false }}>
      <div className="min-h-screen bg-stone-100 dark:bg-stone-900 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
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
                <Download className="w-5 h-5" />
                Installa l'App sul Telefono
              </button>
            )}
            {/* iOS Install Hint */}
            {canInstallPWA && isIOSSafari && !showIOSHint && (
              <button
                onClick={() => setShowIOSHint(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors"
              >
                <Download className="w-5 h-5" />
                Installa l'App sul Telefono
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

        {/* Main content */}
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
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  )
}
