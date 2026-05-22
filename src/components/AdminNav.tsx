'use client'

import { LayoutDashboard, Sparkles, CalendarDays, LogOut } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { IntelliGendaLogo } from '@/components/IntelliGendaLogo'

const navItems = [
  { id: 'admin-dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admin-services' as const, label: 'Servizi', icon: Sparkles },
  { id: 'admin-calendar' as const, label: 'Calendario', icon: CalendarDays },
]

export function AdminNav() {
  const currentView = useAppStore((s) => s.currentView)
  const navigate = useAppStore((s) => s.navigate)
  const logout = useAppStore((s) => s.logout)
  const currentUser = useAppStore((s) => s.currentUser)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <IntelliGendaLogo size="md" showText={false} className="text-stone-900" />
            <h1 className="font-semibold text-lg tracking-tight">IntelliGenda</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Ciao, {currentUser?.name?.split(' ')[0]}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Esci"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 -mb-px">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
