'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
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
    // Safari-specific standalone flag
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

export function PushNotificationSetup({ userId, pendingDoses }: PushNotificationSetupProps) {
  const [denied, setDenied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function setup() {
      if (!('Notification' in window)) return

      // iOS Safari outside standalone mode cannot use Web Push.
      // IosInstallBanner (mounted in the patient layout) handles the install nudge.
      if (isIosSafari() && !isInStandaloneMode()) return

      if (Notification.permission === 'denied') {
        setDenied(true)
        return
      }

      const granted = await requestNotificationPermission()
      if (!granted) {
        setDenied(true)
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

  // iOS non-standalone: Web Push is unavailable here regardless of permission.
  // IosInstallBanner in the layout handles the guidance for this state.
  if (isIosSafari() && !isInStandaloneMode()) return null

  if (denied) {
    // iOS standalone PWA: user denied the permission prompt inside the installed app.
    // There is no deep-link to iOS Settings from a web app — give text instructions.
    const iosStandalone = isIosSafari() && isInStandaloneMode()

    return (
      <div className="mx-4 mt-3 flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
        <p className="flex-1">
          {iosStandalone ? (
            <>
              Notifications are blocked. Open{' '}
              <strong>iPhone Settings → Notifications → MediSync</strong> and
              enable Allow Notifications.
            </>
          ) : (
            <>
              Notifications are blocked. Tap the{' '}
              <strong>lock icon</strong> in your browser's address bar and set
              Notifications to <strong>Allow</strong>, then reload the page.
            </>
          )}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-blue-500 hover:text-blue-700"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return null
}
