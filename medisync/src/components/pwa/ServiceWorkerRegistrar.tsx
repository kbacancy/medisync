'use client'

import { useEffect } from 'react'

/**
 * Registers /sw.js and stores the BeforeInstallPromptEvent so other
 * components can trigger the Add-to-Home-Screen banner on demand.
 *
 * Renders nothing visible — mount it once in the root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // Non-fatal: the app works without the SW (just no offline/push)
        console.warn('[MediSync SW] registration failed:', err)
      })

    // Capture the install prompt so it can be shown at the right moment
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      // Store on window so install-prompt UI components can retrieve it
      ;(window as Window & { __pwaInstallPrompt?: Event }).__pwaInstallPrompt = e
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  return null
}
