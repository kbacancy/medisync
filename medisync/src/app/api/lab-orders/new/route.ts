import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { requireClinician } from '@/lib/api/auth'

const labTestSchema = z.object({
  id:       z.string(),
  name:     z.string(),
  category: z.string(),
})

const schema = z.object({
  patientId: z.uuid(),
  priority:  z.enum(['routine', 'stat', 'urgent']).default('routine'),
  tests:     z.array(labTestSchema).min(1, 'At least one test is required'),
  notes:     z.string().optional(),
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

  // clinicianId always comes from the authenticated session
  const { patientId, priority, tests, notes } = parsed.data
  const supabase = getServiceClient()

  const { data: order, error } = await supabase
    .from('lab_orders')
    .insert({
      patient_id:   patientId,
      clinician_id: auth.userId,
      priority,
      tests,
      notes:        notes ?? null,
      status:       'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create lab order' }, { status: 500 })
  }

  return NextResponse.json({ order })
}
