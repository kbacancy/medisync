import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/notifications/sendPush'

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
    url:       '/medications',
    tag:       'new-message',
    data:      { type: 'new_message', patientId },
    priority:  'normal',
    channelId: 'default',
  })
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
    await notifyPatientNewMessage(supabase, patientId, message)
  }

  return NextResponse.json({ message: newMsg })
}
