import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { requireClinician } from '@/lib/api/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'

const EMERGENCY_TYPES = [
  'cardiac_arrest',
  'respiratory_distress',
  'drug_overdose',
  'psychiatric_crisis',
  'fall_injury',
  'other',
] as const

const schema = z.object({
  type:      z.enum(EMERGENCY_TYPES),
  patientId: z.uuid().optional(),
  notes:     z.string().max(500).optional(),
})

const LABELS: Record<string, string> = {
  cardiac_arrest:       'Cardiac Arrest',
  respiratory_distress: 'Respiratory Distress',
  drug_overdose:        'Drug Overdose',
  psychiatric_crisis:   'Psychiatric Crisis',
  fall_injury:          'Fall / Injury',
  other:                'Emergency',
}

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
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 })
  }

  // Derive clinician name from the authenticated session — never from the client
  const authSupabase = await createServerClient()
  const { data: profile } = await authSupabase
    .from('profiles')
    .select('full_name')
    .eq('id', auth.userId)
    .single()

  const clinicianName = (profile?.full_name as string) ?? 'Unknown Clinician'

  const { type, patientId, notes } = parsed.data
  const supabase = getServiceClient()

  const label = LABELS[type]
  const message = [
    `EMERGENCY — ${label} reported by Dr. ${clinicianName}.`,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const alertPayload: Record<string, unknown> = {
    type:     'emergency',
    message,
    severity: 'critical',
  }
  if (patientId) alertPayload.patient_id = patientId

  const { data: alert, error } = await supabase
    .from('care_alerts')
    .insert(alertPayload)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }

  if (patientId) {
    await supabase
      .from('patients')
      .update({ risk_level: 'CRITICAL' })
      .eq('id', patientId)
  }

  return NextResponse.json({ alert })
}
