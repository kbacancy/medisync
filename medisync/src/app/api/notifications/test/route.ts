/**
 * GET /api/notifications/test
 *
 * Sends a test push notification to the currently authenticated user and
 * returns a diagnostic payload so you can verify the full push pipeline
 * (subscription → VAPID delivery → service worker → OS banner) from the
 * browser without needing a real call.
 *
 * Usage (browser console while logged in as a patient):
 *   fetch('/api/notifications/test').then(r => r.json()).then(console.log)
 *
 * Response:
 *   { ok: true, subscriptions: 1 }          — push sent
 *   { ok: false, reason: '...', hint: '...' } — explains what is missing
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/notifications/sendPush'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, reason: 'Not authenticated' }, { status: 401 })
  }

  // ── VAPID config check ──────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'VAPID keys not configured on the server',
        hint: 'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your deployment environment variables',
      },
      { status: 500 }
    )
  }

  // ── Subscription check ──────────────────────────────────────────────────────
  const serviceSupabase = getServiceClient()
  const { data: subs } = await serviceSupabase
    .from('push_subscriptions')
    .select('token, platform')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: 'No push subscription found for this user',
      hint: 'Open the PWA on your device and tap "Enable" on the notification banner, then retry',
      userId: user.id,
    })
  }

  // ── Send test push ──────────────────────────────────────────────────────────
  await sendPushToUser(serviceSupabase, user.id, {
    title: 'MediSync — Test notification',
    body: 'Push notifications are working correctly on this device.',
    url: '/',
    tag: 'medisync-test',
    priority: 'high',
    urgency: 'high',
  })

  return NextResponse.json({
    ok: true,
    subscriptions: subs.length,
    platforms: subs.map((s) => s.platform),
  })
}
