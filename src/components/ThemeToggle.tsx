'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted ? resolvedTheme === 'dark' : false

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative flex h-8 w-14 items-center rounded-full p-1 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400',
        isDark
          ? 'bg-stone-700'
          : 'bg-stone-200',
        className
      )}
      aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
    >
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-all duration-300',
          isDark
            ? 'translate-x-6 bg-stone-900 text-stone-100'
            : 'translate-x-0 bg-white text-stone-700'
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5" strokeWidth={1.75} />
        ) : (
          <Sun className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </span>
    </button>
  )
}
