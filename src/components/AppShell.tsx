'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Sparkles, Users, CalendarDays, Settings,
  LogOut, Menu, ChevronRight, UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAppStore, type AppView } from '@/lib/store'
import { getActivityTypeName } from '@/lib/activity-types'
import LandingPage from './LandingPage'
import OnboardingWizard from './OnboardingWizard'
import LoginForm from './LoginForm'
import DashboardView from './DashboardView'
import ServicesManager from './ServicesManager'
import StaffManager from './StaffManager'
import ClientsManager from './ClientsManager'
import CalendarView from './CalendarView'
import SettingsView from './SettingsView'

const NAV_ITEMS: { key: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'services', label: 'Servizi', icon: Sparkles },
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'clients', label: 'Clienti', icon: UserCheck },
  { key: 'calendar', label: 'Calendario', icon: CalendarDays },
  { key: 'settings', label: 'Impostazioni', icon: Settings },
]

function SidebarNav({ onNavigate }: { onNavigate?: (view: AppView) => void }) {
  const { currentView, navigate, session, logout } = useAppStore()

  return (
    <div className="flex flex-col h-full">
      {/* Business Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {session?.business?.name?.charAt(0) || 'G'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{session?.business?.name || 'La mia attività'}</p>
            {session?.business?.activityType && (
              <p className="text-xs text-muted-foreground">
                {getActivityTypeName(session.business.activityType)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.key
          return (
            <Button
              key={item.key}
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 min-h-[44px] rounded-xl ${
                isActive ? 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 hover:text-amber-700' : ''
              }`}
              onClick={() => {
                navigate(item.key)
                onNavigate?.(item.key)
              }}
            >
              <Icon className="w-4 h-4" />
              {item.label}
              {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
            </Button>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-border">
        <div className="px-3 pb-2">
          <p className="text-sm font-medium truncate">{session?.account?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{session?.account?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Esci
        </Button>
      </div>
    </div>
  )
}

function AuthenticatedLayout() {
  const { currentView, sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col fixed h-full">
        <SidebarNav />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
          <SidebarNav onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">IntelliGenda</p>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === 'dashboard' && <DashboardView />}
              {currentView === 'services' && <ServicesManager />}
              {currentView === 'staff' && <StaffManager />}
              {currentView === 'clients' && <ClientsManager />}
              {currentView === 'calendar' && <CalendarView />}
              {currentView === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default function AppShell() {
  const { currentView, isHydrated } = useAppStore()

  // Wait for hydration (check session)
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Public views
  if (currentView === 'landing') return <LandingPage />
  if (currentView === 'onboarding') return <OnboardingWizard />
  if (currentView === 'login') return <LoginForm />

  // Authenticated views
  return <AuthenticatedLayout />
}
