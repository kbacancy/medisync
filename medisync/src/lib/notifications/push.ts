import { createClient } from '@/lib/supabase/client'
import type { Prescription } from '@/types'

/**
 * Request browser Notification permission from the user.
 * Must be called from a user-interaction handler (button click, etc.).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * Decode a base64url-encoded VAPID public key to a Uint8Array.
 * Chrome accepts a plain string for applicationServerKey, but iOS Safari
 * strictly requires a Uint8Array — passing the raw string silently prevents
 * the push subscription from being created on iOS.
 */
function vapidKeyToUint8Array(base64urlKey: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64urlKey.length % 4)) % 4)
  const base64 = (base64urlKey + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

/**
 * Subscribe the current browser to Web Push and persist the subscription to
 * push_subscriptions with platform = 'web'.
 *
 * The table stores push data as a JSON string in the `token` column so it
 * shares the same schema as the Expo mobile tokens (platform = 'ios'/'android').
 * JSON shape: { endpoint, keys: { p256dh, auth } }
 */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const registration = await navigator.serviceWorker.ready
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — skipping push subscription')
    return
  }

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Must be Uint8Array — iOS Safari rejects a plain base64url string
      applicationServerKey: vapidKeyToUint8Array(vapidPublicKey),
    })
  }

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  // Serialise the Web Push subscription into the shared `token` column
  const token = JSON.stringify({ endpoint, keys })

  const supabase = createClient()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, token, platform: 'web' },
    { onConflict: 'user_id,platform' }
  )
  if (error) {
    console.error('[push] Failed to save web push subscription:', error.message)
  }

  // Re-subscribe whenever the service worker activates a new version so the
  // push endpoint stays in sync with the active SW registration.
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing
    if (!newWorker) return
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'activated') {
        subscribeToPush(userId).catch(console.warn)
      }
    })
  })
}

/**
 * Show a local browser notification immediately (fallback when the app tab is open).
 */
export async function showLocalNotification(
  title: string,
  body: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, { body, ...options })
  } else {
    new Notification(title, { body, ...options })
  }
}

/**
 * Schedule a dose reminder via the server-side schedule route.
 * Falls back to a client-side setTimeout local notification if the request fails.
 */
export async function scheduleDoseReminder(
  prescription: Prescription,
  scheduledTime: Date
): Promise<void> {
  const now = Date.now()
  const delay = scheduledTime.getTime() - now
  if (delay <= 0) return

  try {
    await fetch('/api/notifications/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prescriptionId: prescription.id,
        drugName: prescription.medication_name,
        strength: prescription.dosage,
        scheduledTime: scheduledTime.toISOString(),
      }),
    })
  } catch {
    setTimeout(async () => {
      await showLocalNotification(
        'Time to take your medication',
        `${prescription.medication_name} ${prescription.dosage} — Tap to log dose`,
        {
          data: { prescriptionId: prescription.id },
          icon: '/icons/icon-192.svg',
        }
      )
    }, delay)
  }
}
