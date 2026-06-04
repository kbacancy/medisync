import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/notifications/sendPush'

const schema = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  doctorName: z.string().min(1),
})

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

  const { appointmentId, patientId, doctorName } = parsed.data
  const supabase = getServiceClient()

  // Jitsi rooms are created automatically on first join — no API call needed.
  // The room name is deterministic so both sides resolve to the same room.
  const roomName = `medisync-${appointmentId}`
  const roomUrl = `https://meet.jit.si/${roomName}`

  await supabase
    .from('appointments')
    .update({
      room_url: roomUrl,
      room_name: roomName,
      status: 'in-call',
      started_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  // Resolve patients.id → profiles.id for push_subscriptions lookup
  const { data: patientRecord } = await supabase
    .from('patients')
    .select('profile_id')
    .eq('id', patientId)
    .maybeSingle()

  const profileId = patientRecord?.profile_id
  if (!profileId) {
    console.warn(`[create-room] No profile_id found for patient ${patientId} — push notification skipped`)
  } else {
    const callUrl =
      `/call?appointmentId=${encodeURIComponent(appointmentId)}` +
      `&roomUrl=${encodeURIComponent(roomUrl)}` +
      `&roomName=${encodeURIComponent(roomName)}`

    await sendPushToUser(supabase, profileId, {
      title: `Dr. ${doctorName} is ready for your appointment`,
      body: 'Tap to join your video consultation now',
      url: callUrl,
      tag: `call-${appointmentId}`,
      data: { type: 'call_started', appointmentId, roomUrl, roomName, doctorName },
      priority: 'high',
      channelId: 'telehealth-calls',
      // Drop after 60 s — a stale "join call" notification is confusing
      ttl: 60,
      urgency: 'high',
    })
  }

  return NextResponse.json({ roomUrl, roomName, appointmentId })
}
