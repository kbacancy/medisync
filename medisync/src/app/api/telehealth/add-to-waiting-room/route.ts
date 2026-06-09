import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { requireClinician } from '@/lib/api/auth'

const schema = z.object({
  patientId: z.uuid(),
  reason:    z.string().min(1).max(500),
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
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { patientId, reason } = parsed.data
  // clinicianId is always the authenticated user — never trusted from the client
  const clinicianId = auth.userId

  const supabase = getServiceClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', patientId)
    .eq('type', 'telehealth')
    .in('status', ['scheduled', 'in-call'])
    .gte('scheduled_at', todayStart.toISOString())
    .lt('scheduled_at', todayEnd.toISOString())
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Patient already has an active telehealth appointment today' },
      { status: 409 }
    )
  }

  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      patient_id:   patientId,
      clinician_id: clinicianId,
      scheduled_at: new Date().toISOString(),
      type:         'telehealth',
      reason,
      status:       'scheduled',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }

  return NextResponse.json({ appointmentId: appt.id })
}
