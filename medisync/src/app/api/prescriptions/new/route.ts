import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const schema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  drugName: z.string().min(1),
  rxcui: z.string().optional(),
  ndc: z.string().optional(),
  strength: z.string().min(1),
  instructions: z.string().optional(),
  frequency: z.string().min(1),
  timeOfDay: z.array(z.string()).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  status: z.string().default('active'),
  overrideCode: z.string().optional(),
  quantityDispensed: z.number().optional(),
  daysSupply: z.number().optional(),
  form: z.string().optional(),
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

  const {
    patientId,
    doctorId,
    drugName,
    rxcui,
    ndc,
    strength,
    instructions,
    frequency,
    timeOfDay,
    startDate,
    endDate,
    status,
    overrideCode,
    daysSupply,
    form,
  } = parsed.data

  const supabase = getServiceClient()

  const { data: prescription, error } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: patientId,
      clinician_id: doctorId,
      medication_name: drugName,
      dosage: strength,
      frequency,
      instructions: instructions ?? null,
      form: form ?? null,
      time_of_day: timeOfDay ?? [],
      start_date: startDate,
      end_date: endDate ?? null,
      status,
      rxcui: rxcui ?? null,
      ndc_code: ndc ?? null,
      days_supply: daysSupply ?? 30,
      refills: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (overrideCode && prescription) {
    await supabase.from('prescription_overrides').insert({
      prescription_id: prescription.id,
      override_code: overrideCode,
      created_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ prescription })
}
