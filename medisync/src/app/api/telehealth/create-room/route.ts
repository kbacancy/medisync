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

async function sendCallPush(
  supabase: ReturnType<typeof getServiceClient>,
  patientId: string,
  appointmentId: string,
  roomUrl: string,
  roomName: string,
  doctorName: string
) {
  // patientId is patients.id — resolve profile_id (= profiles.id = push_subscriptions.user_id)
  const { data: patientRecord } = await supabase
    .from('patients')
    .select('profile_id')
    .eq('id', patientId)
    .maybeSingle()

  const profileId = patientRecord?.profile_id
  if (!profileId) {
    console.error(`[Push] No patients row found for patientId=${patientId}`)
    return
  }

  await sendPushToUser(supabase, profileId, {
    title:     `Dr. ${doctorName} is ready for your appointment`,
    body:      'Tap to join your video consultation now',
    url:       '/medications',
    tag:       `call-${appointmentId}`,
    data:      { type: 'call_started', appointmentId, roomUrl, roomName, doctorName },
    priority:  'high',
    channelId: 'telehealth-calls',
  })
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

  // ── Dev mock: skip Daily.co API but still send push ───────────────────────
  if (process.env.DAILY_MOCK === 'true') {
    const mockRoom = {
      url: `https://mock.daily.co/medisync-${appointmentId}`,
      name: `medisync-${appointmentId}`,
    }
    await supabase
      .from('appointments')
      .update({
        room_url: mockRoom.url,
        room_name: mockRoom.name,
        status: 'in-call',
        started_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    await sendCallPush(supabase, patientId, appointmentId, mockRoom.url, mockRoom.name, doctorName)

    return NextResponse.json({
      roomUrl: mockRoom.url,
      roomName: mockRoom.name,
      appointmentId,
    })
  }

  // Create a Daily.co room that expires in 1 hour
  const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: `medisync-${appointmentId}`,
      privacy: 'public',
      properties: {
        max_participants: 2,
        exp: Math.floor(Date.now() / 1000) + 3600,
        eject_at_room_exp: true,
      },
    }),
  })

  let room: { url: string; name: string }

  if (!dailyRes.ok) {
    const errText = await dailyRes.text()
    // Room already exists — retrieve it rather than failing
    if (dailyRes.status === 400 && errText.includes('already exists')) {
      const getRes = await fetch(
        `https://api.daily.co/v1/rooms/medisync-${appointmentId}`,
        { headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } }
      )
      if (!getRes.ok) {
        return NextResponse.json(
          { error: 'Failed to create or retrieve Daily.co room' },
          { status: 502 }
        )
      }
      room = await getRes.json()
    } else {
      return NextResponse.json(
        { error: 'Daily.co room creation failed', detail: errText },
        { status: 502 }
      )
    }
  } else {
    room = await dailyRes.json()
  }

  await supabase
    .from('appointments')
    .update({
      room_url: room.url,
      room_name: room.name,
      status: 'in-call',
      started_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  await sendCallPush(supabase, patientId, appointmentId, room.url, room.name, doctorName)

  return NextResponse.json({
    roomUrl: room.url,
    roomName: room.name,
    appointmentId,
  })
}
