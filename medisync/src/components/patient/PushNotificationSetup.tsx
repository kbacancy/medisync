'use client'

import { useEffect, useState } from 'react'
import { X, Bell } from 'lucide-react'
import {
  requestNotificationPermission,
  subscribeToPush,
  scheduleDoseReminder,
} from '@/lib/notifications/push'
import type { PrescriptionWithDispense } from '@/types'

interface PendingDose {
  prescription: PrescriptionWithDispense
  scheduledTime: Date
}

interface PushNotificationSetupProps {
  userId: string
  pendingDoses: PendingDose[]
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as { standalone?: boolean }).standalone === true)
  )
}

export function PushNotificationSetup({ userId, pendingDoses }: PushNotificationSetupProps) {
  // 'opt-in'  → iOS standalone, permission not yet requested — show tap-to-enable banner
  // 'denied'  → permission was explicitly blocked
  // 'idle'    → no banner needed
  const [uiState, setUiState] = useState<'idle' | 'opt-in' | 'denied'>('idle')
  const [dismissed, setDismissed] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    async function setup() {
      if (!('Notification' in window)) return

      // iOS non-standalone: Web Push unavailable. IosInstallBanner handles this.
      if (isIosSafari() && !isInStandaloneMode()) return

      const perm = Notification.permission

      if (isIosSafari() && isInStandaloneMode()) {
        if (perm === 'granted') {
          // Already granted — just subscribe (re-entrant, safe)
          await subscribeToPush(userId)
          for (const { prescription, scheduledTime } of pendingDoses) {
            if (scheduledTime > new Date()) {
              await scheduleDoseReminder(prescription, scheduledTime)
            }
          }
          return
        }
        if (perm === 'default') {
          // iOS requires a user gesture to show the system permission dialog.
          // Show opt-in banner; the button click is the gesture.
          setUiState('opt-in')
          return
        }
        // perm === 'denied'
        setUiState('denied')
        return
      }

      // ── Non-iOS browsers ────────────────────────────────────────────────────
      if (perm === 'denied') {
        setUiState('denied')
        return
      }

      const granted = await requestNotificationPermission()
      if (!granted) {
        setUiState('denied')
        return
      }

      await subscribeToPush(userId)
      for (const { prescription, scheduledTime } of pendingDoses) {
        if (scheduledTime > new Date()) {
          await scheduleDoseReminder(prescription, scheduledTime)
        }
      }
    }

    const timer = setTimeout(setup, 1000)
    return () => clearTimeout(timer)
  }, [userId, pendingDoses])

  if (dismissed) return null
  if (uiState === 'idle') return null
  if (isIosSafari() && !isInStandaloneMode()) return null

  // ── iOS standalone: tap-to-enable (the tap IS the required user gesture) ────
  if (uiState === 'opt-in') {
    async function handleEnable() {
      setRequesting(true)
      const granted = await requestNotificationPermission()
      if (granted) {
        await subscribeToPush(userId)
        for (const { prescription, scheduledTime } of pendingDoses) {
          if (scheduledTime > new Date()) {
            await scheduleDoseReminder(prescription, scheduledTime)
          }
        }
        setDismissed(true)
      } else {
        setUiState('denied')
      }
      setRequesting(false)
    }

    return (
      <div className="mx-4 mt-3 flex items-center gap-3 bg-[#0f172a] text-white rounded-xl px-4 py-3 text-sm shadow">
        <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <Bell className="size-4" />
        </div>
        <p className="flex-1 leading-snug text-[13px]">
          <strong className="block">Enable notifications</strong>
          <span className="text-white/70">Get incoming call alerts &amp; dose reminders</span>
        </p>
        <button
          onClick={handleEnable}
          disabled={requesting}
          className="shrink-0 bg-[#10b981] text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform disabled:opacity-60"
        >
          {requesting ? 'Enabling…' : 'Enable'}
        </button>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-white/40 hover:text-white/70" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    )
  }

  // ── Denied state ─────────────────────────────────────────────────────────────
  const iosStandalone = isIosSafari() && isInStandaloneMode()

  async function handleRetry() {
    setRequesting(true)
    const granted = await requestNotificationPermission()
    if (granted) {
      await subscribeToPush(userId)
      setDismissed(true)
    }
    setRequesting(false)
  }

  return (
    <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 text-[13px]">
      <div className="flex items-start gap-2">
        <p className="flex-1 leading-relaxed">
          {iosStandalone ? (
            <>
              Notifications are blocked.{' '}
              <strong>
                Open iPhone Settings → Notifications → MediSync
              </strong>{' '}
              and turn on <em>Allow Notifications</em>.
              <br />
              <span className="text-blue-600 text-[11px]">
                If MediSync is not listed, tap <strong>Try Again</strong> below — the
                system permission dialog should appear.
              </span>
            </>
          ) : (
            <>
              Notifications are blocked. Tap the{' '}
              <strong>lock icon</strong> in your browser&apos;s address bar,
              set Notifications to <strong>Allow</strong>, then reload.
            </>
          )}
        </p>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-blue-400 hover:text-blue-600 mt-0.5" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>

      {/* Re-trigger the iOS system permission dialog in case it was never shown */}
      {iosStandalone && (
        <button
          onClick={handleRetry}
          disabled={requesting}
          className="mt-2 w-full py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {requesting ? 'Requesting…' : 'Try Again'}
        </button>
      )}
    </div>
  )
}
