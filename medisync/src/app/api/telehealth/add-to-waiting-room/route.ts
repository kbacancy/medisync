import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const schema = z.object({
  patientId: z.string().uuid(),
  reason: z.string().min(1),
  clinicianId: z.string().uuid(),
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
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { patientId, reason, clinicianId } = parsed.data
  const supabase = getServiceClient()

  // Block if patient already has an active telehealth appointment today
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
      patient_id: patientId,
      clinician_id: clinicianId,
      scheduled_at: new Date().toISOString(),
      type: 'telehealth',
      reason,
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Failed to create appointment', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ appointmentId: appt.id })
}
