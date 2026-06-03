'use client'

import { useEffect, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { syncAll, getPendingCount } from '@/lib/offline/syncQueue'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    async function handleOnline() {
      setIsOnline(true)
      setDismissed(false)
      await syncAll().catch(console.warn)
      setPendingCount(0)
    }

    function handleOffline() {
      setIsOnline(false)
      setDismissed(false)
      // Refresh count whenever we go offline so the banner is accurate
      getPendingCount().then(setPendingCount).catch(() => setPendingCount(0))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Keep count in sync while offline (actions may be queued after banner appears)
  useEffect(() => {
    if (isOnline || dismissed) return
    const interval = setInterval(() => {
      getPendingCount().then(setPendingCount).catch(() => setPendingCount(0))
    }, 3_000)
    return () => clearInterval(interval)
  }, [isOnline, dismissed])

  if (isOnline || dismissed) return null

  const countLabel =
    pendingCount > 0
      ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} queued`
      : 'Changes will sync when connected'

  return (
    <div className="mx-4 mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
      <WifiOff className="size-4 shrink-0 text-amber-600" />
      <p className="flex-1">
        Offline —{' '}
        <span className="font-medium">{countLabel}</span>
      </p>
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
