/**
 * Server-only push delivery utility.
 *
 * Sends a notification to ALL of a user's registered devices regardless of
 * platform. Handles two delivery paths transparently:
 *
 *  • platform = 'ios' | 'android'  →  Expo Push API (ExponentPushToken)
 *  • platform = 'web'              →  Web Push / VAPID (PWA)
 *
 * Stale / expired tokens are cleaned up automatically after each delivery.
 */

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PushPayload {
  title: string
  body: string
  /** URL to open when the notification is tapped (web push only). */
  url?: string
  /** Notification tag — collapses duplicate notifications on Android/web. */
  tag?: string
  /** Arbitrary data forwarded to the notification handler. */
  data?: Record<string, unknown>
  // Expo-specific options (ignored for web push)
  sound?: 'default' | null
  priority?: 'default' | 'normal' | 'high'
  channelId?: string
}

type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error: string } }

// ─── VAPID config ────────────────────────────────────────────────────────────

function configureWebPush(): boolean {
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject    = process.env.VAPID_SUBJECT ?? 'mailto:admin@medisync.com'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Send `payload` to every push subscription registered for `profileId`
 * (i.e. profiles.id = push_subscriptions.user_id).
 *
 * Silently no-ops when the user has no subscriptions or VAPID keys are absent.
 */
export async function sendPushToUser(
  // Accept any Supabase client shape so callers can pass their own instance
  supabase: SupabaseClient,
  profileId: string,
  payload: PushPayload
): Promise<void> {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('token, platform')
    .eq('user_id', profileId)

  if (!subs || subs.length === 0) return

  const expoSubs = subs.filter(
    (s) => s.platform === 'ios' || s.platform === 'android'
  ) as { token: string; platform: string }[]

  const webSubs = subs.filter(
    (s) => s.platform === 'web'
  ) as { token: string; platform: string }[]

  // Run both delivery paths in parallel — a failure in one never blocks the other
  await Promise.allSettled([
    deliverExpo(supabase, expoSubs, payload),
    deliverWebPush(supabase, webSubs, payload),
  ])
}

// ─── Expo delivery (iOS / Android native) ────────────────────────────────────

async function deliverExpo(
  supabase: SupabaseClient,
  subs: { token: string; platform: string }[],
  payload: PushPayload
): Promise<void> {
  if (subs.length === 0) return

  const messages = subs.map((s) => ({
    to:        s.token,
    title:     payload.title,
    body:      payload.body,
    data:      payload.data ?? {},
    sound:     payload.sound    ?? 'default',
    priority:  payload.priority ?? 'default',
    channelId: payload.channelId ?? 'default',
  }))

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      Accept:            'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })

  if (!res.ok) {
    console.warn(`[push] Expo API returned ${res.status}`)
    return
  }

  const { data: tickets } = (await res.json()) as { data: ExpoTicket[] }
  const staleTokens = (tickets ?? [])
    .map((t, i) =>
      t.status === 'error' && t.details?.error === 'DeviceNotRegistered'
        ? subs[i]?.token
        : null
    )
    .filter((t): t is string => t !== null)

  if (staleTokens.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('token', staleTokens)
  }
}

// ─── Web Push delivery (PWA) ──────────────────────────────────────────────────

async function deliverWebPush(
  supabase: SupabaseClient,
  subs: { token: string; platform: string }[],
  payload: PushPayload
): Promise<void> {
  if (subs.length === 0) return
  if (!configureWebPush()) return

  const webPayload = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url  ?? '/',
    tag:   payload.tag,
    data:  payload.data,
  })

  const staleTokens: string[] = []

  for (const sub of subs) {
    let parsed: { endpoint: string; keys: { p256dh: string; auth: string } }
    try {
      parsed = JSON.parse(sub.token)
    } catch {
      continue // malformed — skip
    }

    try {
      await webpush.sendNotification(
        { endpoint: parsed.endpoint, keys: parsed.keys },
        webPayload
      )
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) staleTokens.push(sub.token)
    }
  }

  if (staleTokens.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('token', staleTokens)
      .eq('platform', 'web')
  }
}
