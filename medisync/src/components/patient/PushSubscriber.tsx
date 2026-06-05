'use client'

import { useEffect } from 'react'
import {
  requestNotificationPermission,
  subscribeToPush,
} from '@/lib/notifications/push'

/**
 * Silently registers the browser for Web Push on every patient page load.
 * Shows no UI — PushNotificationSetup on the medications page handles user-facing
 * prompts and dose-reminder scheduling.
 *
 * Skips iOS Safari in non-standalone mode (Web Push requires the PWA to be
 * installed to the home screen on iOS).
 */
export function PushSubscriber({ userId }: { userId: string }) {
  useEffect(() => {
    async function register() {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return

      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator &&
          (navigator as { standalone?: boolean }).standalone === true)

      // iOS non-standalone: Web Push unavailable, skip silently.
      if (isIos && !isStandalone) return

      // iOS standalone: NEVER call requestPermission() from a setTimeout —
      // iOS requires a direct user gesture. PushNotificationSetup on the
      // medications page handles the tap-to-enable flow for iOS.
      // Here we only subscribe if permission is already granted.
      if (isIos && isStandalone) {
        if (Notification.permission === 'granted') {
          await subscribeToPush(userId)
        }
        return
      }

      // Non-iOS: auto-request is fine (Chrome, Firefox, etc. allow it)
      if (Notification.permission === 'denied') return

      const granted = await requestNotificationPermission()
      if (!granted) return

      await subscribeToPush(userId)
    }

    // Slight delay so it doesn't contend with page hydration
    const t = setTimeout(register, 1500)
    return () => clearTimeout(t)
  }, [userId])

  return null
}
