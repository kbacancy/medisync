import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const schema = z.object({
  prescriptionId: z.string(),
  drugName: z.string(),
  strength: z.string(),
  scheduledTime: z.string(),
})

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@medisync.com'

  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { prescriptionId, drugName, strength, scheduledTime } = parsed.data
  const supabase = getServiceClient()

  const targetTime = new Date(scheduledTime).getTime()
  const now = Date.now()
  const delayMs = targetTime - now

  if (delayMs <= 0) {
    return NextResponse.json({ error: 'Scheduled time is in the past' }, { status: 400 })
  }

  const payload = JSON.stringify({
    title: 'Time to take your medication',
    body: `${drugName} ${strength} — Tap to log dose`,
    data: { prescriptionId },
  })

  // In production this would trigger a Supabase Edge Function or queue.
  // For dev: fire-and-forget setTimeout on the server (process-lifetime only).
  setTimeout(async () => {
    if (!configureWebPush()) return

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
          },
          payload
        )
      } catch {
        // Subscription may have expired — silently skip
      }
    }
  }, delayMs)

  return NextResponse.json(
    { scheduled: true, delayMs, prescriptionId },
    { status: 200 }
  )
}
