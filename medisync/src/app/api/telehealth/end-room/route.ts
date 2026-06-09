import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { requireClinician } from '@/lib/api/auth'
import { sendPushToUser } from '@/lib/notifications/sendPush'

const schema = z.object({
  appointmentId: z.uuid(),
  patientId:     z.uuid().optional(),
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
  const supabase = getServiceClient()

  await supabase
    .from('appointments')
    .update({
      status:   'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  if (patientId) {
    const { data: patientRecord } = await supabase
      .from('patients')
      .select('profile_id')
      .eq('id', patientId)
      .maybeSingle()

    const profileId = patientRecord?.profile_id
    if (profileId) {
      sendPushToUser(supabase, profileId, {
        title:     'Your consultation has ended',
        body:      'Thank you for your appointment. Have a great day!',
        url:       '/medications',
        tag:       `call-ended-${appointmentId}`,
        data:      { type: 'call_ended', appointmentId },
        channelId: 'default',
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}
