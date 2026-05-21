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

export function PushNotificationSetup({ userId, pendingDoses }: PushNotificationSetupProps) {
  const [denied, setDenied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function setup() {
      if (!('Notification' in window)) return

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

    // Only run after a short delay to avoid blocking initial render
    const timer = setTimeout(setup, 1000)
    return () => clearTimeout(timer)
  }, [userId, pendingDoses])

  if (!denied || dismissed) return null

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
