'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

/**
 * Shows an "Install App" banner on Android Chrome when the browser has
 * deferred the beforeinstallprompt event (captured by ServiceWorkerRegistrar).
 *
 * iOS is handled separately inside PushNotificationSetup because on iOS the
 * install instruction is tied to enabling push notifications.
 *
 * Mount this once — it self-hides when not applicable.
 */
export function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Only show on mobile screens (tablets and phones)
    if (window.innerWidth >= 768) return

    // Don't show when already running as an installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) return

    // Check for already-captured prompt (may have fired before this mount)
    if ((window as Window & { __pwaInstallPrompt?: Event }).__pwaInstallPrompt) {
      setCanInstall(true)
    }

    function handlePromptReady() {
      setCanInstall(true)
    }

    // Also listen in case the prompt fires after mount
    window.addEventListener('beforeinstallprompt', handlePromptReady)

    // Hide banner if user installs through another path
    window.addEventListener('appinstalled', () => setCanInstall(false))

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePromptReady)
    }
  }, [])

  async function handleInstall() {
    const prompt = (window as Window & { __pwaInstallPrompt?: Event & { prompt?: () => Promise<{ outcome: string }> } }).__pwaInstallPrompt
    if (!prompt?.prompt) return

    await prompt.prompt()
    setCanInstall(false)
  }

  if (!canInstall || dismissed) return null

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 bg-[#0f172a] text-white rounded-xl px-4 py-3 text-sm shadow-lg">
      <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        <Download className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">Install MediSync</p>
        <p className="text-white/60 text-xs mt-0.5">Add to home screen for the best experience</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-white text-[#0f172a] font-semibold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/50 hover:text-white/80"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
