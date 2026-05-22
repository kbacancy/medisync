import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── GET /api/messages?patientId=<uuid> ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const patientId = request.nextUrl.searchParams.get('patientId')
  if (!patientId) {
    return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('messages')
    .select('id, patient_id, sender_id, sender_role, body, is_read, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data })
}

// ─── POST /api/messages ───────────────────────────────────────────────────────

const postSchema = z.object({
  patientId:  z.string().uuid(),
  senderId:   z.string().uuid(),
  senderRole: z.enum(['clinician', 'patient']),
  message:    z.string().min(1).max(2000),
})

type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error: string } }

async function sendMessagePush(
  supabase: ReturnType<typeof getServiceClient>,
  patientId: string,
  messageBody: string
) {
  const { data: patientRecord } = await supabase
    .from('patients')
    .select('profile_id')
    .eq('id', patientId)
    .maybeSingle()

  if (!patientRecord?.profile_id) return

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('token, platform')
    .eq('user_id', patientRecord.profile_id)
    .in('platform', ['ios', 'android'])

  if (!subs || subs.length === 0) return

  const tokens = subs as { token: string; platform: string }[]
  const messages = tokens.map((s) => ({
    to: s.token,
    title: 'New message from your doctor',
    body: messageBody.length > 80 ? `${messageBody.slice(0, 77)}…` : messageBody,
    data: { type: 'new_message', patientId },
    sound: 'default',
    priority: 'normal',
    channelId: 'default',
  }))

  const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })

  if (!expoRes.ok) return

  const { data: tickets } = (await expoRes.json()) as { data: ExpoTicket[] }
  const staleTokens = (tickets ?? [])
    .map((t, i) =>
      t.status === 'error' && t.details?.error === 'DeviceNotRegistered'
        ? tokens[i]?.token
        : null
    )
    .filter((t): t is string => t !== null)

  if (staleTokens.length > 0) {
    await supabase.from('push_subscriptions').delete().in('token', staleTokens)
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { patientId, senderId, senderRole, message } = parsed.data
  const supabase = getServiceClient()

  const { data: newMsg, error } = await supabase
    .from('messages')
    .insert({
      patient_id:  patientId,
      sender_id:   senderId,
      sender_role: senderRole,
      body:        message,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Push-notify the patient when the clinician sends
  if (senderRole === 'clinician') {
    await sendMessagePush(supabase, patientId, message)
  }

  return NextResponse.json({ message: newMsg })
}
