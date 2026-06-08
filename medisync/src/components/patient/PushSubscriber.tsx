'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, X } from 'lucide-react'
import {
  requestNotificationPermission,
  subscribeToPush,
} from '@/lib/notifications/push'

// LocalStorage key that stores when the user last dismissed the iOS opt-in banner.
const IOS_NOTIF_DISMISSED_KEY = 'ios-notif-banner-dismissed-at'
const DISMISS_TTL_DAYS = 7

/**
 * Registers the browser for Web Push on every patient page load and, for iOS
 * standalone PWAs where notification permission hasn't been granted yet, shows
 * a dismissible opt-in banner.
 *
 * Previously, the iOS opt-in was only on the medications page, so patients who
 * never visited that page never got a push subscription and missed call alerts.
 */
export function PushSubscriber({ userId }: { userId: string }) {
  const pathname = usePathname()
  const [showIosBanner, setShowIosBanner] = useState(false)
  const [requesting, setRequesting] = useState(false)

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

      if (isIos && isStandalone) {
        if (Notification.permission === 'granted') {
          // Already granted — refresh the subscription on every page load so
          // the stored endpoint stays in sync with the active service worker.
          await subscribeToPush(userId)
        } else if (Notification.permission === 'default') {
          // /medications already shows the PushNotificationSetup opt-in banner
          // which also schedules dose reminders. Skip our banner there to avoid
          // showing two prompts simultaneously on the patient's default page.
          if (pathname === '/medications') return

          // iOS requires a direct user gesture to show the system permission dialog.
          // Show the opt-in banner unless the user recently dismissed it.
          const raw = localStorage.getItem(IOS_NOTIF_DISMISSED_KEY)
          const daysSince = raw
            ? (Date.now() - Number(raw)) / 86_400_000
            : Infinity
          if (daysSince > DISMISS_TTL_DAYS) {
            setShowIosBanner(true)
          }
        }
        return
      }

      // Non-iOS: auto-request is fine (Chrome, Firefox, etc. allow it from a setTimeout)
      if (Notification.permission === 'denied') return

      const granted = await requestNotificationPermission()
      if (!granted) return

      await subscribeToPush(userId)
    }

    // Slight delay so it doesn't contend with page hydration
    const t = setTimeout(register, 1500)
    return () => clearTimeout(t)
  }, [userId, pathname])

  async function handleEnable() {
    setRequesting(true)
    const granted = await requestNotificationPermission()
    if (granted) {
      await subscribeToPush(userId)
    }
    setShowIosBanner(false)
    setRequesting(false)
  }

  function handleDismiss() {
    localStorage.setItem(IOS_NOTIF_DISMISSED_KEY, String(Date.now()))
    setShowIosBanner(false)
  }

  if (!showIosBanner) return null

  return (
    <div className="fixed top-[56px] inset-x-0 z-40 px-4 pt-2 pointer-events-none">
      <div className="flex items-center gap-3 bg-[#0f172a] text-white rounded-xl px-4 py-3 text-sm shadow-lg pointer-events-auto">
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
        <button
          onClick={handleDismiss}
          className="shrink-0 text-white/40 hover:text-white/70"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
