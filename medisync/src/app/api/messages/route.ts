import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api/auth'
import { sendPushToUser } from '@/lib/notifications/sendPush'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── GET /api/messages?patientId=<uuid> ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const patientId = request.nextUrl.searchParams.get('patientId')
  if (!patientId || !/^[0-9a-f-]{36}$/i.test(patientId)) {
    return NextResponse.json({ error: 'patientId is required and must be a UUID' }, { status: 400 })
  }

  // Patients can only read their own thread; clinicians can read any thread.
  if (auth.role === 'patient') {
    const supabase = await (await import('@/lib/supabase/server')).createClient()
    const { data: patientRecord } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', auth.userId)
      .eq('id', patientId)
      .maybeSingle()

    if (!patientRecord) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('messages')
    .select('id, patient_id, sender_id, sender_role, body, is_read, created_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  return NextResponse.json({ messages: data })
}

// ─── POST /api/messages ───────────────────────────────────────────────────────

const postSchema = z.object({
  patientId: z.uuid(),
  message:   z.string().min(1).max(2000),
})

async function notifyPatientNewMessage(
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

  const body =
    messageBody.length > 80 ? `${messageBody.slice(0, 77)}…` : messageBody

  await sendPushToUser(supabase, patientRecord.profile_id, {
    title:     'New message from your doctor',
    body,
    url:       '/messages',
    tag:       'new-message',
    data:      { type: 'new_message', patientId },
    priority:  'normal',
    channelId: 'default',
  })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

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

  const { patientId, message } = parsed.data

  // Patients can only send messages in their own thread
  if (auth.role === 'patient') {
    const supabase = await (await import('@/lib/supabase/server')).createClient()
    const { data: patientRecord } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', auth.userId)
      .eq('id', patientId)
      .maybeSingle()

    if (!patientRecord) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Derive sender identity from the authenticated session — never trust the client
  const senderRole = (auth.role === 'clinician')
    ? 'clinician'
    : 'patient'

  const supabase = getServiceClient()

  const { data: newMsg, error } = await supabase
    .from('messages')
    .insert({
      patient_id:  patientId,
      sender_id:   auth.userId,
      sender_role: senderRole,
      body:        message,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  if (senderRole === 'clinician') {
    await notifyPatientNewMessage(supabase, patientId, message)
  }

  return NextResponse.json({ message: newMsg })
}
