import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    patient_id: string
    scheduled_at: string
    type: 'telehealth' | 'in_person'
    reason: string
    duration_minutes?: number
  }

  const { patient_id, scheduled_at, type, reason, duration_minutes = 30 } = body

  if (!patient_id || !scheduled_at || !type || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      clinician_id: user.id,
      patient_id,
      scheduled_at,
      type,
      reason,
      duration_minutes,
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
