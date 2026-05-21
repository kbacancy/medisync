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
 * Subscribe the current browser to Web Push and persist the subscription
 * to the push_subscriptions table for server-sent notifications.
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
    // Pass the raw base64url string — all modern browsers accept it directly
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    })
  }

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  const supabase = createClient()
  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'user_id' }
  )
}

/**
 * Show a local browser notification immediately (fallback when app is open).
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
 * Schedule a dose reminder by calling the server-side schedule route.
 * For development the server uses setTimeout; production should use
 * a Supabase Edge Function cron job.
 */
export async function scheduleDoseReminder(
  prescription: Prescription,
  scheduledTime: Date
): Promise<void> {
  const now = Date.now()
  const delay = scheduledTime.getTime() - now
  if (delay <= 0) return // time already passed

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
    // Fall back to local notification via setTimeout
    setTimeout(async () => {
      await showLocalNotification('Time to take your medication', `${prescription.medication_name} ${prescription.dosage} — Tap to log dose`, {
        data: { prescriptionId: prescription.id },
        icon: '/icon-192.png',
      })
    }, delay)
  }
}

