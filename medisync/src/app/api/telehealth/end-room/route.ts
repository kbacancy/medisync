import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const schema = z.object({
  appointmentId: z.string().min(1),
  roomName: z.string().min(1),
  patientId: z.string().optional(),
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

  const { appointmentId, roomName, patientId } = parsed.data
  const supabase = getServiceClient()

  // Delete the Daily.co room — fire and forget (may already be gone)
  fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
  }).catch(console.error)

  // Mark appointment as completed
  await supabase
    .from('appointments')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  // Notify patient that the call has ended
  if (patientId) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('token, platform')
      .eq('user_id', patientId)
      .in('platform', ['ios', 'android'])

    if (subs && subs.length > 0) {
      const messages = (subs as { token: string; platform: string }[]).map((s) => ({
        to: s.token,
        title: 'Your consultation has ended',
        body: 'Thank you for your appointment. Have a great day!',
        data: { type: 'call_ended', appointmentId },
        sound: 'default',
      }))

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
  }

  return NextResponse.json({ success: true })
}
