import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { toFHIRMedicationDispense } from '@/lib/fhir/adapter'
import type { DispenseRecord, Prescription, Profile } from '@/types'

const schema = z.object({
  prescriptionId: z.string(),
  patientId: z.string(),
  quantityDispensed: z.number().int().positive(),
  daysSupply: z.number().int().positive(),
  pharmacyName: z.string().optional(),
})

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getDosesPerDay(frequency: string): number {
  const f = frequency.toLowerCase()
  if (f.includes('twice') || f.includes('bid') || f.includes('2x')) return 2
  if (f.includes('three') || f.includes('tid') || f.includes('3x')) return 3
  if (f.includes('four') || f.includes('qid') || f.includes('4x')) return 4
  return 1
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

  const { prescriptionId, patientId, quantityDispensed, daysSupply, pharmacyName } =
    parsed.data
  const supabase = getServiceClient()

  // Fetch prescription for medication info
  const { data: prescription, error: rxError } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('id', prescriptionId)
    .single()

  if (rxError || !prescription) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
  }

  // Insert dispense record
  const { data: record, error: insertError } = await supabase
    .from('dispense_records')
    .insert({
      patient_id: patientId,
      prescription_id: prescriptionId,
      quantity_dispensed: quantityDispensed,
      days_supply: daysSupply,
      remaining_count: quantityDispensed,
      dispensed_at: new Date().toISOString(),
      pharmacy_name: pharmacyName ?? null,
    })
    .select()
    .single()

  if (insertError || !record) {
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Check low inventory threshold (≤ 5-day supply of doses)
  const dosesPerDay = getDosesPerDay(prescription.frequency as string)
  const daysRemaining = Math.floor(record.remaining_count / dosesPerDay)

  if (daysRemaining <= 5) {
    await supabase.from('care_alerts').insert({
      patient_id: patientId,
      type: 'low_inventory',
      message: `Low supply warning for ${prescription.medication_name as string}: approximately ${daysRemaining} day(s) remaining.`,
      severity: 'moderate',
    })
  }

  // Fetch patient profile for FHIR mapping
  const { data: patientProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .single()

  const fhirResponse = toFHIRMedicationDispense(
    record as DispenseRecord,
    prescription as Prescription,
    (patientProfile ?? {
      id: patientId,
      full_name: 'Unknown',
      email: '',
      role: 'patient',
      created_at: '',
      updated_at: '',
    }) as Profile
  )

  // Audit log
  await supabase.from('fhir_audit_log').insert({
    resource_type: 'MedicationDispense',
    action: 'CREATE',
    patient_id: patientId,
    payload: fhirResponse,
  })

  return NextResponse.json(fhirResponse, { status: 201 })
}
