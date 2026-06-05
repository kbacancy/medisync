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

function configureWebPush(): boolean {
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
  const delayMs = targetTime - Date.now()

  if (delayMs <= 0) {
    return NextResponse.json({ error: 'Scheduled time is in the past' }, { status: 400 })
  }

  const payload = JSON.stringify({
    title: 'Time to take your medication',
    body: `${drugName} ${strength} — Tap to log dose`,
    url: '/medications',
    tag: `dose-${prescriptionId}`,
    data: { prescriptionId },
  })

  // Resolve the patient's profile_id so we only push to the right user.
  const { data: rxRow } = await supabase
    .from('prescriptions')
    .select('patient_id')
    .eq('id', prescriptionId)
    .maybeSingle()

  const patientId = rxRow?.patient_id
  if (!patientId) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
  }

  const { data: patientRow } = await supabase
    .from('patients')
    .select('profile_id')
    .eq('id', patientId)
    .maybeSingle()

  const profileId = patientRow?.profile_id
  if (!profileId) {
    return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
  }

  // In production this should be a Supabase Edge Function cron or pg_cron job.
  // For dev: fire-and-forget setTimeout (process-lifetime only).
  setTimeout(async () => {
    if (!configureWebPush()) return

    // Fetch only this patient's Web Push subscription.
    const { data: rows } = await supabase
      .from('push_subscriptions')
      .select('token')
      .eq('platform', 'web')
      .eq('user_id', profileId)

    const staleTokens: string[] = []

    for (const row of rows ?? []) {
      let sub: { endpoint: string; keys: { p256dh: string; auth: string } }
      try {
        sub = JSON.parse(row.token as string)
      } catch {
        continue // malformed token — skip
      }

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )
      } catch (err: unknown) {
        // 404 / 410 = subscription expired or unsubscribed
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          staleTokens.push(row.token as string)
        }
      }
    }

    // Clean up expired subscriptions
    if (staleTokens.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('token', staleTokens)
        .eq('platform', 'web')
    }
  }, delayMs)

  return NextResponse.json({ scheduled: true, delayMs, prescriptionId }, { status: 200 })
}
