'use client'

import { useEffect, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { syncAll } from '@/lib/offline/syncQueue'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    function handleOnline() {
      setIsOnline(true)
      setDismissed(false)
      syncAll().catch(console.warn)
    }

    function handleOffline() {
      setIsOnline(false)
      setDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline || dismissed) return null

  return (
    <div className="mx-4 mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
      <WifiOff className="size-4 shrink-0 text-amber-600" />
      <p className="flex-1">Offline — changes will sync when connected</p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 hover:text-amber-700"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
