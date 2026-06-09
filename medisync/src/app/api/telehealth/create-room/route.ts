import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { requireClinician } from '@/lib/api/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/notifications/sendPush'

const schema = z.object({
  appointmentId: z.uuid(),
  patientId:     z.uuid(),
})

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const auth = await requireClinician()
  if (!auth.ok) return auth.response

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

  const { appointmentId, patientId } = parsed.data

  // Derive doctor name from the authenticated clinician's profile
  const authSupabase = await createServerClient()
  const { data: clinicianProfile } = await authSupabase
    .from('profiles')
    .select('full_name')
    .eq('id', auth.userId)
    .single()

  const doctorName = clinicianProfile?.full_name as string ?? 'Your Doctor'

  const supabase = getServiceClient()

  const roomName = `medisync-${appointmentId}`
  const roomUrl = `https://meet.jit.si/${roomName}`

  await supabase
    .from('appointments')
    .update({
      room_url:   roomUrl,
      room_name:  roomName,
      status:     'in-call',
      started_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  const { data: patientRecord } = await supabase
    .from('patients')
    .select('profile_id')
    .eq('id', patientId)
    .maybeSingle()

  const profileId = patientRecord?.profile_id
  if (!profileId) {
    console.warn(`[create-room] No profile_id found for patient ${patientId} — push notification skipped`)
  } else {
    // Only send the appointmentId in the URL — the call page resolves the
    // roomUrl server-side from the appointment record (avoids PHI in URL params)
    const callUrl = `/call?appointmentId=${encodeURIComponent(appointmentId)}`

    await sendPushToUser(supabase, profileId, {
      title:     `Dr. ${doctorName} is ready for your appointment`,
      body:      'Tap to join your video consultation now',
      url:       callUrl,
      tag:       `call-${appointmentId}`,
      data:      { type: 'call_started', appointmentId, roomUrl, roomName, doctorName },
      priority:  'high',
      channelId: 'telehealth-calls',
      ttl:       120,
      urgency:   'high',
    })
  }

  return NextResponse.json({ roomUrl, roomName, appointmentId })
}
