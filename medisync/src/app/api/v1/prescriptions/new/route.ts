import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import {
  toFHIRMedicationRequest,
  fromFHIRMedicationRequest,
  type FHIRMedicationRequest,
} from '@/lib/fhir/adapter'
import type { Prescription, Profile } from '@/types'

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const nativeSchema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  medicationName: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  daysSupply: z.number().int().positive().optional(),
  refills: z.number().int().min(0).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  ndcCode: z.string().optional(),
  status: z.enum(['active', 'discontinued', 'completed']).optional(),
  overrideCode: z.string().optional(),
})

// ─── DDI Helpers ──────────────────────────────────────────────────────────────

const SEED_INTERACTIONS = [
  { drug_a: 'Warfarin', drug_b: 'Aspirin', severity: 'severe', description: 'Concurrent use significantly increases bleeding risk due to additive anticoagulant effects.' },
  { drug_a: 'Lisinopril', drug_b: 'Potassium', severity: 'moderate', description: 'ACE inhibitors raise serum potassium. Monitor electrolytes.' },
  { drug_a: 'Metformin', drug_b: 'Alcohol', severity: 'moderate', description: 'Alcohol potentiates metformin-induced lactic acidosis risk.' },
  { drug_a: 'Simvastatin', drug_b: 'Amiodarone', severity: 'severe', description: 'Amiodarone inhibits CYP3A4, dramatically increasing simvastatin levels and myopathy risk.' },
  { drug_a: 'Sertraline', drug_b: 'Tramadol', severity: 'severe', description: 'Risk of serotonin syndrome. Combination may be life-threatening without monitoring.' },
  { drug_a: 'Metoprolol', drug_b: 'Verapamil', severity: 'severe', description: 'Causes severe bradycardia and AV heart block due to additive depression of cardiac conduction.' },
  { drug_a: 'Ciprofloxacin', drug_b: 'Tizanidine', severity: 'severe', description: 'CYP1A2 inhibition causes dramatic tizanidine elevation with risk of hypotension.' },
]

function norm(s: string) {
  return s.toLowerCase().trim()
}

interface DrugInteraction {
  drug_a: string
  drug_b: string
  severity: string
  description: string
}

interface DDIResult {
  hasSevere: boolean
  interaction?: DrugInteraction
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkDDI(supabase: any, patientId: string, newDrug: string): Promise<DDIResult> {
  const { data: activePrescriptions } = await supabase
    .from('prescriptions')
    .select('medication_name')
    .eq('patient_id', patientId)
    .eq('status', 'active')

  const existing = ((activePrescriptions ?? []) as Array<{ medication_name: string }>).map((p) =>
    norm(p.medication_name)
  )
  const newNorm = norm(newDrug)
  const allDrugs = [...existing, newNorm]

  const { data: dbInteractions } = (await supabase
    .from('drug_interactions')
    .select('*')) as { data: DrugInteraction[] | null }

  let interactions: DrugInteraction[]
  if (!dbInteractions || dbInteractions.length === 0) {
    await supabase.from('drug_interactions').insert(SEED_INTERACTIONS)
    interactions = SEED_INTERACTIONS
  } else {
    interactions = dbInteractions
  }

  for (const ix of interactions) {
    const a = norm(ix.drug_a)
    const b = norm(ix.drug_b)
    const aHit = allDrugs.some((d) => d.includes(a) || a.includes(d))
    const bHit = allDrugs.some((d) => d.includes(b) || b.includes(d))
    const newIsA = newNorm.includes(a) || a.includes(newNorm)
    const newIsB = newNorm.includes(b) || b.includes(newNorm)

    if (aHit && bHit && (newIsA || newIsB) && ix.severity === 'severe') {
      return { hasSevere: true, interaction: ix }
    }
  }
  return { hasSevere: false }
}

// ─── Route ────────────────────────────────────────────────────────────────────

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

  const supabase = getServiceClient()

  // Detect FHIR vs native payload
  let patientId: string
  let doctorId: string
  let medicationName: string
  let dosage: string
  let frequency: string
  let daysSupply: number
  let refills: number
  let startDate: string
  let endDate: string | undefined
  let ndcCode: string | undefined
  let overrideCode: string | undefined
  let status: Prescription['status'] = 'active'

  if (
    typeof body === 'object' &&
    body !== null &&
    'resourceType' in body &&
    (body as Record<string, unknown>).resourceType === 'MedicationRequest'
  ) {
    const partial = fromFHIRMedicationRequest(body as FHIRMedicationRequest)
    if (!partial.patient_id || !partial.clinician_id || !partial.medication_name) {
      return NextResponse.json(
        { error: 'Invalid FHIR MedicationRequest: missing required fields' },
        { status: 400 }
      )
    }
    patientId = partial.patient_id
    doctorId = partial.clinician_id
    medicationName = partial.medication_name
    dosage = partial.dosage ?? ''
    frequency = partial.frequency ?? ''
    daysSupply = partial.days_supply ?? 30
    refills = partial.refills ?? 0
    startDate = partial.start_date ?? new Date().toISOString().split('T')[0]
    endDate = partial.end_date
    ndcCode = partial.ndc_code
    status = partial.status ?? 'active'
  } else {
    const parsed = nativeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const d = parsed.data
    patientId = d.patientId
    doctorId = d.doctorId
    medicationName = d.medicationName
    dosage = d.dosage
    frequency = d.frequency
    daysSupply = d.daysSupply ?? 30
    refills = d.refills ?? 0
    startDate = d.startDate
    endDate = d.endDate
    ndcCode = d.ndcCode
    overrideCode = d.overrideCode
    status = d.status ?? 'active'
  }

  // Run DDI check (skip if overrideCode provided)
  if (!overrideCode) {
    const ddi = await checkDDI(supabase, patientId, medicationName)
    if (ddi.hasSevere) {
      await supabase.from('fhir_audit_log').insert({
        resource_type: 'MedicationRequest',
        action: 'CREATE_BLOCKED_DDI',
        patient_id: patientId,
        payload: { body, interaction: ddi.interaction },
      })
      return NextResponse.json(
        { error: 'DDI_CONFLICT', interaction: ddi.interaction },
        { status: 409 }
      )
    }
  }

  // Insert prescription
  const { data: prescription, error } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: patientId,
      clinician_id: doctorId,
      medication_name: medicationName,
      dosage,
      frequency,
      days_supply: daysSupply,
      refills,
      start_date: startDate,
      end_date: endDate ?? null,
      ndc_code: ndcCode ?? null,
      status,
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
      doctor_id: doctorId,
    })
  }

  // Fetch patient and doctor profiles for FHIR mapping
  const [{ data: patientProfile }, { data: doctorProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', patientId).single(),
    supabase.from('profiles').select('*').eq('id', doctorId).single(),
  ])

  const fhirResponse = toFHIRMedicationRequest(
    prescription as Prescription,
    (patientProfile ?? { id: patientId, full_name: 'Unknown', email: '', role: 'patient', created_at: '', updated_at: '' }) as Profile,
    (doctorProfile ?? { id: doctorId, full_name: 'Unknown', email: '', role: 'clinician', created_at: '', updated_at: '' }) as Profile
  )

  // Audit log
  await supabase.from('fhir_audit_log').insert({
    resource_type: 'MedicationRequest',
    action: 'CREATE',
    patient_id: patientId,
    payload: fhirResponse,
  })

  return NextResponse.json(fhirResponse, { status: 201 })
}
