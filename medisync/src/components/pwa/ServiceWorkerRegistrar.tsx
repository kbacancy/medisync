'use client'

import { useEffect } from 'react'

// All cache keys from previous SW versions that must be evicted.
// Add the OLD key here whenever sw.js CACHE_VERSION is bumped.
const STALE_SW_CACHES = ['medisync-v1']

/**
 * Registers /sw.js and stores the BeforeInstallPromptEvent so other
 * components can trigger the Add-to-Home-Screen banner on demand.
 *
 * On first mount it also checks for stale SW caches from older versions.
 * If found, it unregisters all service workers, wipes every cache, and
 * reloads — giving Turbopack a clean slate and preventing "module factory
 * not available" errors caused by cached chunks from an old bundle.
 *
 * Renders nothing visible — mount it once in the root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let mounted = true

    ;(async () => {
      // Detect stale caches left by a previous SW version.
      const cacheKeys = await caches.keys()
      const stale = cacheKeys.filter(k => STALE_SW_CACHES.includes(k))

      if (stale.length > 0) {
        // Unregister every SW and delete every cache, then reload so the
        // new sw.js takes over with a clean cache (medisync-v2).
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
        await Promise.all(cacheKeys.map(k => caches.delete(k)))
        window.location.reload()
        return
      }

      if (!mounted) return

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(err => console.warn('[MediSync SW] registration failed:', err))
    })()

    // Capture the install prompt so it can be shown at the right moment
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      ;(window as Window & { __pwaInstallPrompt?: Event }).__pwaInstallPrompt = e
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      mounted = false
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  return null
}
