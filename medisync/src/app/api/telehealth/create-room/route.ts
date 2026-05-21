import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

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

  const { appointmentId, patientId, doctorId: _doctorId, doctorName } = parsed.data

  // Create a private Daily.co room that expires in 1 hour
  const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: `medisync-${appointmentId}`,
      privacy: 'private',
      properties: {
        max_participants: 2,
        enable_chat: true,
        enable_screenshare: true,
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

  const supabase = getServiceClient()

  // Persist room details and update appointment status
  await supabase
    .from('appointments')
    .update({
      room_url: room.url,
      room_name: room.name,
      status: 'in-call',
      started_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  // Look up the patient's Expo push token(s)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('token, platform')
    .eq('user_id', patientId)
    .in('platform', ['ios', 'android'])

  if (subs && subs.length > 0) {
    const messages = (subs as { token: string; platform: string }[]).map((s) => ({
      to: s.token,
      title: `Dr. ${doctorName} is ready for your appointment`,
      body: 'Tap to join your video consultation now',
      data: {
        type: 'call_started',
        appointmentId,
        roomUrl: room.url,
        roomName: room.name,
        doctorName,
      },
      sound: 'default',
      priority: 'high',
      channelId: 'dose-reminders',
    }))

    // Send via Expo Push API — fire and forget
    fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    }).catch(console.error)
  }

  return NextResponse.json({
    roomUrl: room.url,
    roomName: room.name,
    appointmentId,
  })
}
