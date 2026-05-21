import type { Prescription, DispenseRecord, AdherenceLog, Profile } from '@/types'

// ─── FHIR R4 Interfaces ───────────────────────────────────────────────────────

export interface FHIRCoding {
  system: string
  code: string
  display?: string
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[]
  text?: string
}

export interface FHIRReference {
  reference: string
  display?: string
}

export interface FHIRQuantity {
  value: number
  unit: string
  system?: string
  code?: string
}

export interface FHIRDosageInstruction {
  text: string
  timing?: {
    repeat?: {
      frequency?: number
      period?: number
      periodUnit?: string
    }
  }
  doseAndRate?: Array<{
    doseQuantity?: FHIRQuantity
  }>
}

export interface FHIRMeta {
  profile: string[]
}

export interface FHIRAnnotation {
  text: string
}

export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest'
  id: string
  meta: FHIRMeta
  status:
    | 'active'
    | 'on-hold'
    | 'cancelled'
    | 'completed'
    | 'entered-in-error'
    | 'stopped'
    | 'draft'
    | 'unknown'
  intent:
    | 'proposal'
    | 'plan'
    | 'order'
    | 'original-order'
    | 'reflex-order'
    | 'filler-order'
    | 'instance-order'
    | 'option'
  medicationCodeableConcept: FHIRCodeableConcept
  subject: FHIRReference
  requester: FHIRReference
  authoredOn?: string
  dosageInstruction: FHIRDosageInstruction[]
  dispenseRequest?: {
    numberOfRepeatsAllowed?: number
    quantity?: FHIRQuantity
    expectedSupplyDuration?: FHIRQuantity
  }
}

export interface FHIRMedicationDispense {
  resourceType: 'MedicationDispense'
  id: string
  meta: FHIRMeta
  status:
    | 'preparation'
    | 'in-progress'
    | 'cancelled'
    | 'on-hold'
    | 'completed'
    | 'entered-in-error'
    | 'stopped'
    | 'declined'
    | 'unknown'
  medicationCodeableConcept: FHIRCodeableConcept
  subject: FHIRReference
  quantity: FHIRQuantity
  daysSupply: FHIRQuantity
  whenHandedOver: string
  performer?: Array<{ actor: FHIRReference }>
}

export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement'
  id: string
  meta: FHIRMeta
  status:
    | 'active'
    | 'completed'
    | 'entered-in-error'
    | 'intended'
    | 'stopped'
    | 'on-hold'
    | 'unknown'
    | 'not-taken'
  medicationCodeableConcept: FHIRCodeableConcept
  subject: FHIRReference
  effectiveDateTime: string
  dateAsserted: string
  note?: FHIRAnnotation[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm'
const NDC_SYSTEM = 'http://hl7.org/fhir/sid/ndc'
const FHIR_BASE = 'http://hl7.org/fhir/StructureDefinition'
const UCUM_SYSTEM = 'http://unitsofmeasure.org'

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function prescriptionStatusToFHIR(
  status: Prescription['status']
): FHIRMedicationRequest['status'] {
  switch (status) {
    case 'active':
      return 'active'
    case 'discontinued':
      return 'stopped'
    case 'completed':
      return 'completed'
    default:
      return 'unknown'
  }
}

function adherenceStatusToFHIR(
  status: AdherenceLog['status']
): FHIRMedicationStatement['status'] {
  switch (status) {
    case 'taken':
    case 'late':
      return 'completed'
    case 'missed':
    case 'skipped':
      return 'not-taken'
    case 'pending':
      return 'intended'
    case 'snoozed':
      return 'on-hold'
    default:
      return 'unknown'
  }
}

function buildMedicationConcept(
  medicationName: string,
  ndcCode?: string | null
): FHIRCodeableConcept {
  const coding: FHIRCoding[] = [
    {
      system: RXNORM_SYSTEM,
      code: ndcCode ?? medicationName.toLowerCase().replace(/\s+/g, '-'),
      display: medicationName,
    },
  ]
  if (ndcCode) {
    coding.push({ system: NDC_SYSTEM, code: ndcCode, display: medicationName })
  }
  return { coding, text: medicationName }
}

function parseDosageValue(dosage: string): { value: number; unit: string } {
  const match = dosage.match(/^([\d.]+)\s*(.*)$/)
  return match
    ? { value: parseFloat(match[1]), unit: match[2].trim() || 'unit' }
    : { value: 1, unit: 'unit' }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Maps a MediSync Prescription → FHIR R4 MedicationRequest resource.
 */
export function toFHIRMedicationRequest(
  prescription: Prescription,
  patient: Profile,
  doctor: Profile
): FHIRMedicationRequest {
  const { value: doseValue, unit: doseUnit } = parseDosageValue(prescription.dosage)

  return {
    resourceType: 'MedicationRequest',
    id: prescription.id,
    meta: { profile: [`${FHIR_BASE}/MedicationRequest`] },
    status: prescriptionStatusToFHIR(prescription.status),
    intent: 'order',
    medicationCodeableConcept: buildMedicationConcept(
      prescription.medication_name,
      prescription.ndc_code
    ),
    subject: { reference: `Patient/${patient.id}`, display: patient.full_name },
    requester: { reference: `Practitioner/${doctor.id}`, display: doctor.full_name },
    authoredOn: prescription.created_at,
    dosageInstruction: [
      {
        text: `${prescription.dosage} ${prescription.frequency}`,
        doseAndRate: [
          {
            doseQuantity: { value: doseValue, unit: doseUnit },
          },
        ],
      },
    ],
    dispenseRequest: {
      numberOfRepeatsAllowed: prescription.refills,
      expectedSupplyDuration: {
        value: prescription.days_supply,
        unit: 'days',
        system: UCUM_SYSTEM,
        code: 'd',
      },
    },
  }
}

/**
 * Maps a MediSync DispenseRecord → FHIR R4 MedicationDispense resource.
 */
export function toFHIRMedicationDispense(
  record: DispenseRecord,
  prescription: Prescription,
  patient: Profile
): FHIRMedicationDispense {
  const resource: FHIRMedicationDispense = {
    resourceType: 'MedicationDispense',
    id: record.id,
    meta: { profile: [`${FHIR_BASE}/MedicationDispense`] },
    status: 'completed',
    medicationCodeableConcept: buildMedicationConcept(
      prescription.medication_name,
      prescription.ndc_code
    ),
    subject: { reference: `Patient/${patient.id}`, display: patient.full_name },
    quantity: {
      value: record.quantity_dispensed,
      unit: 'tablets',
      system: UCUM_SYSTEM,
      code: '{tbl}',
    },
    daysSupply: {
      value: record.days_supply,
      unit: 'days',
      system: UCUM_SYSTEM,
      code: 'd',
    },
    whenHandedOver: record.dispensed_at,
  }

  if (record.pharmacy_name) {
    resource.performer = [
      {
        actor: {
          reference: `Organization/${record.pharmacy_name.toLowerCase().replace(/\s+/g, '-')}`,
          display: record.pharmacy_name,
        },
      },
    ]
  }

  return resource
}

/**
 * Maps a MediSync AdherenceLog → FHIR R4 MedicationStatement resource.
 */
export function toFHIRMedicationStatement(
  log: AdherenceLog,
  prescription: Prescription,
  patient: Profile
): FHIRMedicationStatement {
  const resource: FHIRMedicationStatement = {
    resourceType: 'MedicationStatement',
    id: log.id,
    meta: { profile: [`${FHIR_BASE}/MedicationStatement`] },
    status: adherenceStatusToFHIR(log.status),
    medicationCodeableConcept: buildMedicationConcept(
      prescription.medication_name,
      prescription.ndc_code
    ),
    subject: { reference: `Patient/${patient.id}`, display: patient.full_name },
    effectiveDateTime: log.actual_time ?? log.scheduled_time,
    dateAsserted: new Date().toISOString(),
  }

  if (log.skip_reason) {
    resource.note = [{ text: log.skip_reason }]
  } else if (log.status === 'snoozed' && log.snooze_until) {
    resource.note = [{ text: `Snoozed until ${log.snooze_until}` }]
  }

  return resource
}

/**
 * Reverse: parse an incoming FHIR R4 MedicationRequest → MediSync Prescription shape.
 */
export function fromFHIRMedicationRequest(
  fhir: FHIRMedicationRequest
): Partial<Prescription> {
  const subjectRef = fhir.subject?.reference ?? ''
  const requesterRef = fhir.requester?.reference ?? ''
  const patientId = subjectRef.startsWith('Patient/')
    ? subjectRef.slice(8)
    : subjectRef
  const clinicianId = requesterRef.startsWith('Practitioner/')
    ? requesterRef.slice(13)
    : requesterRef

  const concept = fhir.medicationCodeableConcept
  const medicationName = concept?.text ?? concept?.coding?.[0]?.display ?? 'Unknown'
  const ndcCoding = concept?.coding?.find((c) => c.system === NDC_SYSTEM)

  const instruction = fhir.dosageInstruction?.[0]
  const doseQty = instruction?.doseAndRate?.[0]?.doseQuantity
  const dosage = doseQty
    ? `${doseQty.value}${doseQty.unit}`
    : instruction?.text?.split(' ')[0] ?? ''

  let status: Prescription['status'] = 'active'
  if (fhir.status === 'stopped' || fhir.status === 'cancelled') {
    status = 'discontinued'
  } else if (fhir.status === 'completed') {
    status = 'completed'
  }

  const startDate =
    fhir.authoredOn?.split('T')[0] ?? new Date().toISOString().split('T')[0]

  return {
    patient_id: patientId,
    clinician_id: clinicianId,
    medication_name: medicationName,
    dosage,
    frequency: instruction?.text ?? '',
    days_supply: fhir.dispenseRequest?.expectedSupplyDuration?.value ?? 30,
    refills: fhir.dispenseRequest?.numberOfRepeatsAllowed ?? 0,
    status,
    ndc_code: ndcCoding?.code ?? undefined,
    start_date: startDate,
  }
}
