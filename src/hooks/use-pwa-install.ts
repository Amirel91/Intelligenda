'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Hook to manage PWA install prompt.
 *
 * - Captures the native `beforeinstallprompt` event (Chrome/Android/Edge).
 * - Detects iOS Safari (which doesn't support the event) and offers a guided tooltip.
 * - Returns `canInstall`, `isIOS`, `promptInstall()`, and `dismiss()`.
 *
 * The button should be shown when `canInstall` is true.
 * It auto-hides after install or manual dismiss (persisted in localStorage).
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Already dismissed or already installed — skip
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa-install-dismissed')) return

    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Detect iOS Safari
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = !!(navigator.userAgent.match(/Safari/) && !navigator.userAgent.match(/CriOS|FxiOS|OPiOS/))
    if (isAppleDevice && isSafari) {
      setIsIOS(true)
    }

    // Capture native beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install
    const installedHandler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Native prompt (Chrome/Android)
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    }
    // For iOS, the component shows a tooltip — no programmatic trigger
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    localStorage.setItem('pwa-install-dismissed', '1')
    setIsInstalled(true) // effectively hides the button
  }, [])

  const canInstall = !isInstalled && (deferredPrompt !== null || isIOS)

  return { canInstall, isIOS, promptInstall, dismiss }
}
