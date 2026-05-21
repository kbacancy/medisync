import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { toFHIRMedicationStatement } from '@/lib/fhir/adapter'
import { calculatePDCByPrescription, getRiskFromPDC } from '@/lib/pdc/calculator'
import type { AdherenceLog, Prescription, Profile } from '@/types'

const schema = z.object({
  logId: z.string(),
  patientId: z.string(),
  prescriptionId: z.string(),
  status: z.enum(['taken', 'skipped', 'snoozed', 'missed']),
  actualTime: z.string().optional(),
  skipReason: z.string().optional(),
  snoozeUntil: z.string().optional(),
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

  const { logId, patientId, prescriptionId, status, actualTime, skipReason, snoozeUntil } =
    parsed.data
  const supabase = getServiceClient()

  const updateData: Record<string, unknown> = {
    status,
    skip_reason: skipReason ?? null,
    snooze_until: snoozeUntil ?? null,
  }
  if (status === 'taken') {
    updateData.actual_time = actualTime ?? new Date().toISOString()
  }

  const { data: updatedLog, error: updateError } = await supabase
    .from('adherence_logs')
    .update(updateData)
    .eq('id', logId)
    .select()
    .single()

  if (updateError || !updatedLog) {
    return NextResponse.json(
      { error: updateError?.message ?? 'Update failed' },
      { status: 500 }
    )
  }

  // Fetch prescription for PDC calculation and FHIR mapping
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('id', prescriptionId)
    .single()

  if (status === 'taken' && prescription) {
    // Recalculate PDC
    const { data: allLogs } = await supabase
      .from('adherence_logs')
      .select('*')
      .eq('patient_id', patientId)
      .eq('prescription_id', prescriptionId)

    const periodStart = prescription.start_date as string
    const periodEnd = new Date().toISOString().split('T')[0]

    const pdc = calculatePDCByPrescription(
      (allLogs ?? []) as AdherenceLog[],
      prescriptionId,
      periodStart,
      periodEnd
    )

    await supabase.from('pdc_scores').upsert(
      {
        patient_id: patientId,
        prescription_id: prescriptionId,
        score: pdc,
        period_start: `${periodStart}T00:00:00.000Z`,
        period_end: `${periodEnd}T23:59:59.999Z`,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,prescription_id' }
    )

    const riskLevel = getRiskFromPDC(pdc)
    await supabase
      .from('patients')
      .update({ risk_level: riskLevel })
      .eq('id', patientId)
  }

  if (status === 'missed' && prescription) {
    // Check if PDC has dropped below 80% → fire adherence_drop alert
    const { data: pdcRow } = await supabase
      .from('pdc_scores')
      .select('score')
      .eq('patient_id', patientId)
      .eq('prescription_id', prescriptionId)
      .single()

    const currentPDC = pdcRow?.score ?? 100
    if (currentPDC < 80) {
      await supabase.from('care_alerts').insert({
        patient_id: patientId,
        type: 'adherence_drop',
        message: `Adherence drop detected for ${prescription.medication_name as string}: PDC is ${currentPDC}% (below 80% threshold).`,
        severity: 'high',
      })
    }
  }

  // Fetch patient profile for FHIR mapping
  const { data: patientProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .single()

  const fhirResponse = toFHIRMedicationStatement(
    updatedLog as AdherenceLog,
    (prescription ?? { id: prescriptionId, medication_name: 'Unknown', ndc_code: null }) as Prescription,
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
    resource_type: 'MedicationStatement',
    action: status.toUpperCase(),
    patient_id: patientId,
    payload: fhirResponse,
  })

  return NextResponse.json(fhirResponse, { status: 200 })
}
