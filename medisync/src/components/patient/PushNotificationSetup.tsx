'use client'

import { useEffect, useState } from 'react'
import { X, Share } from 'lucide-react'
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
  // iOS Safari needs the app installed before Web Push works
  const [showIosPrompt, setShowIosPrompt] = useState(false)

  useEffect(() => {
    async function setup() {
      if (!('Notification' in window)) return

      // On iOS Safari outside of standalone mode, Web Push is unavailable.
      // Guide the user to install the PWA first.
      if (isIosSafari() && !isInStandaloneMode()) {
        setShowIosPrompt(true)
        return
      }

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

  // iOS: nudge user to install before they can get push notifications
  if (showIosPrompt) {
    return (
      <div className="mx-4 mt-3 flex items-start gap-3 bg-sky-50 border border-sky-200 text-sky-900 rounded-xl px-4 py-3 text-sm">
        <Share className="size-4 shrink-0 mt-0.5 text-sky-500" />
        <p className="flex-1 leading-relaxed">
          To receive dose reminders, tap{' '}
          <span className="font-semibold">Share</span> then{' '}
          <span className="font-semibold">Add to Home Screen</span> — then reopen MediSync from your home screen.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-sky-400 hover:text-sky-600"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  // Standard browser: permission was denied
  if (denied) {
    return (
      <div className="mx-4 mt-3 flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
        <p className="flex-1">
          Enable notifications to get dose reminders.{' '}
          <a
            href="https://support.google.com/chrome/answer/3220216"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Open browser settings
          </a>
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
