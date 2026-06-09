/**
 * MediSync Seed Script — Phase 7
 * Populates the Supabase database with realistic demo data.
 *
 * Run: npm run seed
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { calculatePDC } from '../pdc/calculator'

// ─── Bootstrap ────────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function todayAt(hour: number, minute = 0): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

function dayAt(baseDate: Date, hour: number, minute = 0): Date {
  const d = new Date(baseDate)
  d.setHours(hour, minute, 0, 0)
  return d
}

function log(msg: string) {
  process.stdout.write(`  ${msg}\n`)
}

async function getOrCreateUser(
  email: string,
  password: string,
  fullName: string,
  role: 'clinician' | 'patient'
): Promise<string> {
  // Check existence first to avoid trigger errors on re-seed
  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`)

  const existing = list?.users.find((u) => u.email === email)
  if (existing) {
    log(`↩ Existing user: ${email}`)
    // Upsert profile in case the trigger failed on a previous run
    await sb.from('profiles').upsert(
      { id: existing.id, email, full_name: fullName, role },
      { onConflict: 'id' }
    )
    return existing.id
  }

  // Create new user
  const { data: created, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (error || !created.user) {
    throw new Error(`Could not create user: ${email} — ${error?.message ?? 'unknown error'}`)
  }

  log(`✓ Created user: ${email}`)

  // Manually upsert profile in case the handle_new_user trigger is not installed
  await sb.from('profiles').upsert(
    { id: created.user.id, email, full_name: fullName, role },
    { onConflict: 'id' }
  )

  return created.user.id
}

// ─── 1. Users + Profiles ─────────────────────────────────────────────────────
async function seedUsers() {
  console.log('\n👤  Creating users…')

  const doctorId = await getOrCreateUser(
    'dr.james.carter@medisync.dev',
    'MediSync2024!',
    'Dr. James Carter',
    'clinician'
  )

  const coordinatorId = await getOrCreateUser(
    'coordinator@medisync.dev',
    'MediSync2024!',
    'Sarah Mills',
    'clinician'
  )

  const sarahId = await getOrCreateUser(
    'sarah.jenkins@medisync.dev',
    'MediSync2024!',
    'Sarah Jenkins',
    'patient'
  )

  const jamesId = await getOrCreateUser(
    'james.wilson@medisync.dev',
    'MediSync2024!',
    'James Wilson',
    'patient'
  )

  const aishaId = await getOrCreateUser(
    'aisha.johnson@medisync.dev',
    'MediSync2024!',
    'Aisha Johnson',
    'patient'
  )

  const robertId = await getOrCreateUser(
    'robert.chen@medisync.dev',
    'MediSync2024!',
    'Robert Chen',
    'patient'
  )

  // Upsert profiles (trigger may have already created them with basic fields)
  const profiles = [
    { id: doctorId, email: 'dr.james.carter@medisync.dev', full_name: 'Dr. James Carter', role: 'clinician', phone: '+1-555-0101' },
    { id: coordinatorId, email: 'coordinator@medisync.dev', full_name: 'Sarah Mills', role: 'clinician', phone: '+1-555-0102' },
    { id: sarahId, email: 'sarah.jenkins@medisync.dev', full_name: 'Sarah Jenkins', role: 'patient', phone: '+1-555-0201' },
    { id: jamesId, email: 'james.wilson@medisync.dev', full_name: 'James Wilson', role: 'patient', phone: '+1-555-0202' },
    { id: aishaId, email: 'aisha.johnson@medisync.dev', full_name: 'Aisha Johnson', role: 'patient', phone: '+1-555-0203' },
    { id: robertId, email: 'robert.chen@medisync.dev', full_name: 'Robert Chen', role: 'patient', phone: '+1-555-0204' },
  ]

  const { error: profileErr } = await sb.from('profiles').upsert(profiles, { onConflict: 'id' })
  if (profileErr) throw new Error(`Profile upsert failed: ${profileErr.message}`)
  log(`✓ Profiles upserted (6)`)

  return { doctorId, coordinatorId, sarahId, jamesId, aishaId, robertId }
}

// ─── 2. Patients ──────────────────────────────────────────────────────────────
async function seedPatients(
  doctorId: string,
  ids: { sarahId: string; jamesId: string; aishaId: string; robertId: string }
) {
  console.log('\n🏥  Creating patient records…')

  const { sarahId, jamesId, aishaId, robertId } = ids

  // Delete any existing care_alerts / fhir_audit_log for these profiles
  // (no cascade from patients table to these Phase-6 tables)
  const profileIds = [sarahId, jamesId, aishaId, robertId]

  // Get existing patient IDs for these profiles
  const { data: existingPatients } = await sb
    .from('patients')
    .select('id')
    .in('profile_id', profileIds)

  if (existingPatients && existingPatients.length > 0) {
    const existingIds = existingPatients.map((p) => p.id as string)
    await sb.from('care_alerts').delete().in('patient_id', existingIds)
    await sb.from('fhir_audit_log').delete().in('patient_id', existingIds)
    await sb.from('patients').delete().in('profile_id', profileIds)
    log(`↩ Cleared ${existingPatients.length} existing patient records`)
  }

  const patients = [
    {
      profile_id: sarahId,
      assigned_doctor_id: doctorId,
      date_of_birth: '1982-03-14',
      gender: 'Female',
      blood_type: 'A+',
      blood_pressure: '128/84',
      heart_rate: 72,
      risk_level: 'LOW',
      allergies: ['Penicillin', 'Sulfa drugs'],
      diagnoses: ['Type 2 Diabetes Mellitus (E11)', 'Hypertension (I10)'],
    },
    {
      profile_id: jamesId,
      assigned_doctor_id: doctorId,
      date_of_birth: '1955-07-22',
      gender: 'Male',
      blood_type: 'O-',
      blood_pressure: '145/92',
      heart_rate: 88,
      risk_level: 'CRITICAL',
      allergies: ['Aspirin', 'Latex'],
      diagnoses: ['Coronary Artery Disease (I25)', 'Heart Failure (I50)', 'Atrial Fibrillation (I48)'],
    },
    {
      profile_id: aishaId,
      assigned_doctor_id: doctorId,
      date_of_birth: '1990-11-05',
      gender: 'Female',
      blood_type: 'B+',
      blood_pressure: '118/76',
      heart_rate: 68,
      risk_level: 'MODERATE',
      allergies: ['Codeine'],
      diagnoses: ['Asthma (J45)', 'Allergic Rhinitis (J30)', 'Anxiety Disorder (F41)'],
    },
    {
      profile_id: robertId,
      assigned_doctor_id: doctorId,
      date_of_birth: '1968-09-30',
      gender: 'Male',
      blood_type: 'AB+',
      blood_pressure: '135/88',
      heart_rate: 80,
      risk_level: 'HIGH',
      allergies: ['Ibuprofen', 'Shellfish'],
      diagnoses: ['Chronic Kidney Disease Stage 3 (N18.3)', 'Type 2 Diabetes Mellitus (E11)', 'Hyperlipidaemia (E78)'],
    },
  ]

  const { data: inserted, error } = await sb.from('patients').insert(patients).select('id, profile_id')
  if (error || !inserted) throw new Error(`Patient insert failed: ${error?.message}`)

  const byProfile = Object.fromEntries(inserted.map((p) => [p.profile_id as string, p.id as string]))
  log(`✓ Inserted ${inserted.length} patients`)

  return {
    sarahPatientId: byProfile[sarahId],
    jamesPatientId: byProfile[jamesId],
    aishaPatientId: byProfile[aishaId],
    robertPatientId: byProfile[robertId],
  }
}

// ─── 3. Prescriptions ─────────────────────────────────────────────────────────
interface RxDef {
  patientId: string
  clinicianId: string
  medication_name: string
  dosage: string
  form: string
  frequency: string
  time_of_day: string[]
  instructions: string
  days_supply: number
  refills: number
  ndc_code?: string
}

async function seedPrescriptions(
  doctorId: string,
  p: { sarahPatientId: string; jamesPatientId: string; aishaPatientId: string; robertPatientId: string }
) {
  console.log('\n💊  Creating prescriptions…')

  const startDate = daysAgo(30).toISOString().split('T')[0]

  const rxDefs: RxDef[] = [
    // Sarah Jenkins — 4 active meds
    {
      patientId: p.sarahPatientId, clinicianId: doctorId,
      medication_name: 'Lisinopril', dosage: '10mg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['morning'],
      instructions: 'Take 1 tablet with water before breakfast. Monitor blood pressure weekly.',
      days_supply: 30, refills: 5, ndc_code: '68180-0513',
    },
    {
      patientId: p.sarahPatientId, clinicianId: doctorId,
      medication_name: 'Metformin', dosage: '500mg', form: 'Tablet',
      frequency: 'Twice daily', time_of_day: ['morning', 'evening'],
      instructions: 'Take with food to reduce stomach upset. Monitor blood glucose.',
      days_supply: 30, refills: 3, ndc_code: '70010-0079',
    },
    {
      patientId: p.sarahPatientId, clinicianId: doctorId,
      medication_name: 'Atorvastatin', dosage: '20mg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['bedtime'],
      instructions: 'Take at bedtime for best effectiveness. Avoid grapefruit juice.',
      days_supply: 30, refills: 2, ndc_code: '0071-0156',
    },
    {
      patientId: p.sarahPatientId, clinicianId: doctorId,
      medication_name: 'Aspirin', dosage: '81mg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['morning'],
      instructions: 'Take with food or milk. Low-dose for cardiovascular protection.',
      days_supply: 30, refills: 11, ndc_code: '0363-0467',
    },
    // James Wilson — 2 active meds
    {
      patientId: p.jamesPatientId, clinicianId: doctorId,
      medication_name: 'Metoprolol', dosage: '25mg', form: 'Tablet',
      frequency: 'Twice daily', time_of_day: ['morning', 'evening'],
      instructions: 'Take with or without food. Do not stop suddenly — taper with doctor guidance.',
      days_supply: 30, refills: 4, ndc_code: '0378-0264',
    },
    {
      patientId: p.jamesPatientId, clinicianId: doctorId,
      medication_name: 'Furosemide', dosage: '40mg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['morning'],
      instructions: 'Take in the morning to avoid nocturia. Monitor weight and electrolytes.',
      days_supply: 30, refills: 2, ndc_code: '0781-0506',
    },
    // Aisha Johnson — 3 active meds
    {
      patientId: p.aishaPatientId, clinicianId: doctorId,
      medication_name: 'Sertraline', dosage: '50mg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['morning'],
      instructions: 'Take at the same time each day. May take 4–6 weeks for full effect.',
      days_supply: 30, refills: 5, ndc_code: '0049-4900',
    },
    {
      patientId: p.aishaPatientId, clinicianId: doctorId,
      medication_name: 'Levothyroxine', dosage: '75mcg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['morning'],
      instructions: 'Take on empty stomach 30–60 minutes before breakfast. Avoid calcium/iron supplements within 4 hours.',
      days_supply: 30, refills: 5, ndc_code: '0074-9286',
    },
    {
      patientId: p.aishaPatientId, clinicianId: doctorId,
      medication_name: 'Omeprazole', dosage: '20mg', form: 'Capsule',
      frequency: 'Once daily', time_of_day: ['morning'],
      instructions: 'Take 30–60 minutes before a meal. Swallow whole, do not crush.',
      days_supply: 30, refills: 3, ndc_code: '0093-7253',
    },
    // Robert Chen — 2 active meds
    {
      patientId: p.robertPatientId, clinicianId: doctorId,
      medication_name: 'Amlodipine', dosage: '5mg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['morning'],
      instructions: 'May be taken with or without food. Monitor for ankle swelling.',
      days_supply: 30, refills: 4, ndc_code: '0069-1540',
    },
    {
      patientId: p.robertPatientId, clinicianId: doctorId,
      medication_name: 'Simvastatin', dosage: '40mg', form: 'Tablet',
      frequency: 'Once daily', time_of_day: ['bedtime'],
      instructions: 'Take in the evening or at bedtime. Avoid grapefruit juice.',
      days_supply: 30, refills: 2, ndc_code: '0006-0749',
    },
  ]

  const toInsert = rxDefs.map((rx) => ({
    patient_id: rx.patientId,
    clinician_id: rx.clinicianId,
    medication_name: rx.medication_name,
    dosage: rx.dosage,
    form: rx.form,
    frequency: rx.frequency,
    time_of_day: rx.time_of_day,
    instructions: rx.instructions,
    days_supply: rx.days_supply,
    refills: rx.refills,
    ndc_code: rx.ndc_code ?? null,
    start_date: startDate,
    status: 'active',
  }))

  const { data: prescriptions, error } = await sb
    .from('prescriptions')
    .insert(toInsert)
    .select('id, medication_name, patient_id, time_of_day, frequency')

  if (error || !prescriptions) throw new Error(`Prescription insert failed: ${error?.message}`)
  log(`✓ Inserted ${prescriptions.length} prescriptions`)
  return prescriptions as Array<{
    id: string
    medication_name: string
    patient_id: string
    time_of_day: string[]
    frequency: string
  }>
}

// ─── 4. Dispense Records ──────────────────────────────────────────────────────
async function seedDispenseRecords(
  prescriptions: Array<{ id: string; patient_id: string; medication_name: string }>,
  patientIds: { sarahPatientId: string; jamesPatientId: string; aishaPatientId: string; robertPatientId: string }
) {
  console.log('\n📦  Creating dispense records…')

  const remainingByPatient: Record<string, number> = {
    [patientIds.sarahPatientId]: 11,
    [patientIds.jamesPatientId]: 22,
    [patientIds.aishaPatientId]: 4,
    [patientIds.robertPatientId]: 14,
  }

  const dispensedAt = daysAgo(20).toISOString()

  const records = prescriptions.map((rx) => ({
    patient_id: rx.patient_id,
    prescription_id: rx.id,
    quantity_dispensed: 30,
    days_supply: 30,
    remaining_count: remainingByPatient[rx.patient_id] ?? 15,
    dispensed_at: dispensedAt,
    pharmacy_name: 'MediSync Pharmacy',
  }))

  const { error } = await sb.from('dispense_records').insert(records)
  if (error) throw new Error(`Dispense insert failed: ${error.message}`)
  log(`✓ Inserted ${records.length} dispense records`)
}

// ─── 5. Adherence Logs ────────────────────────────────────────────────────────
interface PatientAdherenceConfig {
  patientId: string
  takenDays: Set<number>      // 0-indexed from periodStart (0 = 30 days ago)
  skippedDays: Set<number>
  skipReason: string
}

function buildAdherenceLogs(
  rx: { id: string; patient_id: string; time_of_day: string[] },
  config: PatientAdherenceConfig,
  periodDays: number
) {
  const SLOT_HOURS: Record<string, number> = { morning: 8, afternoon: 13, evening: 18, bedtime: 21 }
  const SLOT_MINUTES: Record<string, number> = { morning: 0, afternoon: 0, evening: 30, bedtime: 0 }

  const slots = rx.time_of_day.length ? rx.time_of_day : ['morning']
  const periodStart = daysAgo(periodDays)
  periodStart.setHours(0, 0, 0, 0)

  const logs: object[] = []

  for (let dayIdx = 0; dayIdx < periodDays; dayIdx++) {
    const dayDate = new Date(periodStart)
    dayDate.setDate(dayDate.getDate() + dayIdx)

    const isToday = dayIdx === periodDays - 0 // exclude — handled separately below

    for (const slot of slots) {
      const hour = SLOT_HOURS[slot] ?? 8
      const minute = SLOT_MINUTES[slot] ?? 0
      const scheduled = dayAt(dayDate, hour, minute)

      let status: string
      let actualTime: string | null = null
      let skipReason: string | null = null

      if (config.takenDays.has(dayIdx)) {
        status = 'taken'
        actualTime = new Date(scheduled.getTime() + 7 * 60_000).toISOString()
      } else if (config.skippedDays.has(dayIdx)) {
        status = 'skipped'
        skipReason = config.skipReason
      } else {
        status = 'missed'
      }

      logs.push({
        patient_id: config.patientId,
        prescription_id: rx.id,
        scheduled_time: scheduled.toISOString(),
        actual_time: actualTime,
        status,
        skip_reason: skipReason,
      })
    }
  }

  // Today's pending doses
  const todaySlots = slots
  for (const slot of todaySlots) {
    const hour = SLOT_HOURS[slot] ?? 8
    const minute = SLOT_MINUTES[slot] ?? 0
    const scheduled = todayAt(hour, minute)
    logs.push({
      patient_id: config.patientId,
      prescription_id: rx.id,
      scheduled_time: scheduled.toISOString(),
      actual_time: null,
      status: 'pending',
      skip_reason: null,
    })
  }

  return logs
}

async function seedAdherenceLogs(
  prescriptions: Array<{ id: string; patient_id: string; time_of_day: string[]; frequency: string }>,
  patientIds: { sarahPatientId: string; jamesPatientId: string; aishaPatientId: string; robertPatientId: string }
) {
  console.log('\n📅  Generating adherence logs…')

  const PERIOD = 30 // days of history

  // Sarah Jenkins (94% PDC): 28 taken, 2 skipped
  const sarahTaken = new Set(Array.from({ length: 28 }, (_, i) => i))
  const sarahSkipped = new Set([28, 29])

  // James Wilson (61% PDC): 18 taken, 8 missed, 4 skipped
  const jamesTaken = new Set([0, 1, 2, 4, 5, 7, 9, 10, 13, 15, 16, 18, 20, 21, 23, 24, 26, 28])
  const jamesSkipped = new Set([3, 12, 19, 27])
  // Days not in either set (6,8,11,14,17,22,25,29) = missed

  // Aisha Johnson (88% PDC): 26 taken, 4 missed
  const aishaMissed = new Set([8, 15, 22, 28])
  const aishaTaken = new Set(Array.from({ length: 30 }, (_, i) => i).filter((i) => !aishaMissed.has(i)))

  // Robert Chen (72% PDC): 22 taken, 5 missed, 3 skipped
  const robertMissed = new Set([5, 12, 20, 25, 29])
  const robertSkipped = new Set([8, 18, 27])
  const robertTaken = new Set(
    Array.from({ length: 30 }, (_, i) => i).filter((i) => !robertMissed.has(i) && !robertSkipped.has(i))
  )

  const configs: Record<string, PatientAdherenceConfig> = {
    [patientIds.sarahPatientId]: {
      patientId: patientIds.sarahPatientId,
      takenDays: sarahTaken,
      skippedDays: sarahSkipped,
      skipReason: 'Side effects',
    },
    [patientIds.jamesPatientId]: {
      patientId: patientIds.jamesPatientId,
      takenDays: jamesTaken,
      skippedDays: jamesSkipped,
      skipReason: 'Forgot',
    },
    [patientIds.aishaPatientId]: {
      patientId: patientIds.aishaPatientId,
      takenDays: aishaTaken,
      skippedDays: new Set(),
      skipReason: '',
    },
    [patientIds.robertPatientId]: {
      patientId: patientIds.robertPatientId,
      takenDays: robertTaken,
      skippedDays: robertSkipped,
      skipReason: 'Felt unwell',
    },
  }

  let totalLogs = 0

  for (const rx of prescriptions) {
    const config = configs[rx.patient_id]
    if (!config) continue
    const logs = buildAdherenceLogs(rx, config, PERIOD)

    // Batch insert in chunks of 500
    for (let i = 0; i < logs.length; i += 500) {
      const chunk = logs.slice(i, i + 500)
      const { error } = await sb.from('adherence_logs').insert(chunk)
      if (error) throw new Error(`Adherence log insert failed (rx ${rx.id}): ${error.message}`)
    }
    totalLogs += logs.length
  }

  log(`✓ Inserted ${totalLogs} adherence log entries`)
}

// ─── 6. PDC Scores ────────────────────────────────────────────────────────────
async function seedPDCScores(
  prescriptions: Array<{ id: string; patient_id: string; medication_name: string }>,
  patientIds: { sarahPatientId: string; jamesPatientId: string; aishaPatientId: string; robertPatientId: string }
) {
  console.log('\n📊  Calculating PDC scores…')

  const periodStart = daysAgo(30)
  periodStart.setHours(0, 0, 0, 0)
  const periodEnd = new Date()
  periodEnd.setHours(23, 59, 59, 999)

  // Fetch all adherence logs for these patients
  const patientIdList = Object.values(patientIds)
  const { data: allLogs } = await sb
    .from('adherence_logs')
    .select('prescription_id, scheduled_time, status')
    .in('patient_id', patientIdList)
    .eq('status', 'taken')

  const logsByPrescription = new Map<string, Date[]>()
  for (const l of allLogs ?? []) {
    const existing = logsByPrescription.get(l.prescription_id as string) ?? []
    existing.push(new Date(l.scheduled_time as string))
    logsByPrescription.set(l.prescription_id as string, existing)
  }

  const pdcRows = prescriptions.map((rx) => {
    const takenDates = logsByPrescription.get(rx.id) ?? []
    const score = calculatePDC({
      dispensingDates: takenDates,
      daysSupply: takenDates.map(() => 1),
      periodStart,
      periodEnd,
    })
    return {
      patient_id: rx.patient_id,
      prescription_id: rx.id,
      score,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      calculated_at: new Date().toISOString(),
    }
  })

  const { error } = await sb
    .from('pdc_scores')
    .upsert(pdcRows, { onConflict: 'patient_id,prescription_id' })
  if (error) throw new Error(`PDC upsert failed: ${error.message}`)

  pdcRows.forEach((r) => {
    const rx = prescriptions.find((p) => p.id === r.prescription_id)
    log(`  ${rx?.medication_name.padEnd(20)} → PDC ${r.score}%`)
  })
  log(`✓ Upserted ${pdcRows.length} PDC scores`)
}

// ─── 7. Drug Interactions ─────────────────────────────────────────────────────
async function seedDrugInteractions() {
  console.log('\n⚠️   Seeding drug interactions…')

  const { count } = await sb
    .from('drug_interactions')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    log(`↩ Drug interactions already seeded (${count} rows)`)
    return
  }

  const interactions = [
    { drug_a: 'Warfarin', drug_b: 'Aspirin', severity: 'severe', description: 'Concurrent use significantly increases bleeding risk due to additive anticoagulant effects. Monitor INR closely and assess bleeding risk before prescribing.' },
    { drug_a: 'Simvastatin', drug_b: 'Amiodarone', severity: 'severe', description: 'Amiodarone inhibits CYP3A4, dramatically increasing simvastatin plasma levels. Risk of myopathy and rhabdomyolysis — consider alternative statin.' },
    { drug_a: 'Sertraline', drug_b: 'Tramadol', severity: 'severe', description: 'Risk of serotonin syndrome. Both agents increase serotonergic activity — the combination can be life-threatening. Avoid concurrent use.' },
    { drug_a: 'Lisinopril', drug_b: 'Potassium', severity: 'moderate', description: 'ACE inhibitors reduce potassium excretion. Concurrent supplementation may cause hyperkalemia — monitor serum electrolytes regularly.' },
    { drug_a: 'Metformin', drug_b: 'Alcohol', severity: 'moderate', description: 'Alcohol potentiates metformin-induced lactic acidosis risk. Advise patients to avoid excessive alcohol consumption.' },
    { drug_a: 'Metoprolol', drug_b: 'Verapamil', severity: 'moderate', description: 'Additive depression of AV nodal conduction may cause bradycardia. Use with caution and monitor heart rate.' },
    { drug_a: 'Atorvastatin', drug_b: 'Clarithromycin', severity: 'moderate', description: 'Clarithromycin inhibits CYP3A4, increasing atorvastatin exposure and myopathy risk. Suspend atorvastatin during antibiotic course or use lowest dose.' },
  ]

  const { error } = await sb.from('drug_interactions').insert(interactions)
  if (error) throw new Error(`DDI insert failed: ${error.message}`)
  log(`✓ Inserted ${interactions.length} drug interactions`)
}

// ─── 8. Appointments ──────────────────────────────────────────────────────────
async function seedAppointments(
  doctorId: string,
  patientIds: { sarahPatientId: string; jamesPatientId: string; aishaPatientId: string; robertPatientId: string }
) {
  console.log('\n📋  Creating appointments…')

  const appointments = [
    // Today — Sarah Jenkins 9:00 AM telehealth (waiting → scheduled)
    {
      clinician_id: doctorId,
      patient_id: patientIds.sarahPatientId,
      scheduled_at: todayAt(9, 0).toISOString(),
      duration_minutes: 30,
      type: 'telehealth',
      reason: 'Follow-up: Migraine',
      status: 'scheduled',
      notes: 'Patient is in waiting room',
    },
    // Today — James Wilson 10:30 AM telehealth (waiting)
    {
      clinician_id: doctorId,
      patient_id: patientIds.jamesPatientId,
      scheduled_at: todayAt(10, 30).toISOString(),
      duration_minutes: 30,
      type: 'telehealth',
      reason: 'Medication Review',
      status: 'scheduled',
      notes: 'Patient is in waiting room',
    },
    // Today — Aisha Johnson 2:30 PM in-person (upcoming)
    {
      clinician_id: doctorId,
      patient_id: patientIds.aishaPatientId,
      scheduled_at: todayAt(14, 30).toISOString(),
      duration_minutes: 45,
      type: 'in_person',
      reason: 'General Wellness',
      status: 'scheduled',
    },
    // Today — Robert Chen 3:15 PM telehealth (upcoming)
    {
      clinician_id: doctorId,
      patient_id: patientIds.robertPatientId,
      scheduled_at: todayAt(15, 15).toISOString(),
      duration_minutes: 30,
      type: 'telehealth',
      reason: 'Blood Pressure Check',
      status: 'scheduled',
    },
    // Yesterday — Sarah Jenkins completed
    {
      clinician_id: doctorId,
      patient_id: patientIds.sarahPatientId,
      scheduled_at: dayAt(daysAgo(1), 11, 0).toISOString(),
      duration_minutes: 30,
      type: 'telehealth',
      reason: 'Routine Follow-up',
      status: 'completed',
    },
  ]

  const { error } = await sb.from('appointments').insert(appointments)
  if (error) throw new Error(`Appointment insert failed: ${error.message}`)
  log(`✓ Inserted ${appointments.length} appointments`)
}

// ─── 9. Care Alerts ───────────────────────────────────────────────────────────
async function seedCareAlerts(patientIds: { jamesPatientId: string; robertPatientId: string }) {
  console.log('\n🚨  Creating care alerts…')

  const alerts = [
    {
      patient_id: patientIds.jamesPatientId,
      type: 'patient_report',
      message: 'Patient reported high pain intensity (8/10) via portal 2h ago.',
      severity: 'high',
      is_read: false,
    },
    {
      patient_id: patientIds.jamesPatientId,
      type: 'refill_overdue',
      message: 'Refill overdue — Furosemide 40mg. Patient has 4 days supply remaining.',
      severity: 'critical',
      is_read: false,
    },
    {
      patient_id: patientIds.robertPatientId,
      type: 'adherence_drop',
      message: 'PDC score dropped below 80% threshold for Robert Chen (72%). Review medication plan.',
      severity: 'moderate',
      is_read: false,
    },
  ]

  const { error } = await sb.from('care_alerts').insert(alerts)
  if (error) throw new Error(`Care alert insert failed: ${error.message}`)
  log(`✓ Inserted ${alerts.length} care alerts`)
}

// ─── Pre-flight ───────────────────────────────────────────────────────────────
async function preflight() {
  // 1. Verify the schema has been applied
  const { error: tblErr } = await sb.from('profiles').select('id').limit(1)
  if (tblErr) {
    console.error('\n❌  Pre-flight check failed.')
    console.error('   The `profiles` table does not exist (or is inaccessible).')
    console.error('   Please apply the database schema first:')
    console.error('   1. Open Supabase Dashboard → SQL Editor → New Query')
    console.error('   2. Paste and run: supabase/schema.sql')
    console.error('   3. Paste and run: supabase/migrations/phase6_fhir_realtime_push.sql')
    console.error(`\n   Raw error: ${tblErr.message}\n`)
    process.exit(1)
  }
  log('✓ Pre-flight: profiles table accessible')

  // 2. Probe auth: try creating a user without any user_metadata first
  //    (isolates whether the issue is the enum cast in handle_new_user)
  console.log('\n🔬  Auth probe — testing user creation…')

  async function tryCreateCanary(label: string, body: object): Promise<string | null> {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY!,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json() as { id?: string; msg?: string; code?: string | number; error_code?: string }
    if (res.ok && json.id) {
      log(`✓ Auth probe (${label}): OK — id ${json.id}`)
      await sb.auth.admin.deleteUser(json.id)
      return json.id
    }
    log(`✗ Auth probe (${label}): HTTP ${res.status} — ${json.msg ?? JSON.stringify(json)}`)
    return null
  }

  const ts = Date.now()

  // Variant A: no user_metadata (rules out enum cast issue in trigger)
  const a = await tryCreateCanary('no metadata', {
    email: `canary-a-${ts}@example.com`,
    password: 'Canary1234!',
    email_confirm: true,
  })

  // Variant B: with role metadata (same as real seed flow)
  const b = await tryCreateCanary('with role metadata', {
    email: `canary-b-${ts}@example.com`,
    password: 'Canary1234!',
    email_confirm: true,
    user_metadata: { full_name: 'Canary', role: 'patient' },
  })

  if (!a && !b) {
    console.error('\n❌  Auth probe: all variants failed. Diagnose by running in SQL Editor:\n')
    console.error('   -- 1. Check trigger function body')
    console.error('   SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = \'handle_new_user\';\n')
    console.error('   -- 2. Check all triggers on auth.users')
    console.error('   SELECT trigger_name, event_manipulation FROM information_schema.triggers')
    console.error("   WHERE event_object_schema = 'auth' AND event_object_table = 'users';\n")
    console.error('   -- 3. Test if profiles INSERT works standalone')
    console.error('   DO $$ BEGIN')
    console.error("    INSERT INTO profiles (id, email, full_name, role)")
    console.error("    VALUES ('00000000-0000-0000-0000-000000000001', 'x@x.com', 'X', 'patient');")
    console.error('   EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE \'FK error — RLS OK\';')
    console.error('   WHEN others THEN RAISE NOTICE \'Error: %\', SQLERRM; END $$;\n')
    console.error('   Paste the results above and share for further diagnosis.\n')
    process.exit(1)
  }

  if (!b && a) {
    console.error('\n⚠️  Only "no metadata" variant works — the user_role enum cast is failing.')
    console.error('   Run this in Supabase SQL Editor to fix the trigger:\n')
    console.error("   CREATE OR REPLACE FUNCTION handle_new_user()")
    console.error("   RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$")
    console.error("   BEGIN")
    console.error("     INSERT INTO profiles (id, email, full_name, role)")
    console.error("     VALUES (NEW.id, NEW.email,")
    console.error("       COALESCE(NEW.raw_user_meta_data->>'full_name', ''),")
    console.error("       COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'::user_role)")
    console.error("     ) ON CONFLICT (id) DO NOTHING;")
    console.error("     RETURN NEW;")
    console.error("   END; $$;\n")
    process.exit(1)
  }

  log('✓ Auth probe complete')
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  MediSync Seed — starting…')
  console.log(`   Database: ${SUPABASE_URL}`)

  try {
    await preflight()

    const userIds = await seedUsers()
    const { doctorId, sarahId, jamesId, aishaId, robertId } = userIds

    const patientIds = await seedPatients(doctorId, { sarahId, jamesId, aishaId, robertId })

    const prescriptions = await seedPrescriptions(doctorId, patientIds)

    await seedDispenseRecords(prescriptions, patientIds)

    await seedAdherenceLogs(prescriptions, patientIds)

    await seedPDCScores(prescriptions, patientIds)

    await seedDrugInteractions()

    await seedAppointments(doctorId, patientIds)

    await seedCareAlerts({
      jamesPatientId: patientIds.jamesPatientId,
      robertPatientId: patientIds.robertPatientId,
    })

    console.log('\n✅  Seed complete! Demo credentials:')
    console.log('   Doctor:      dr.james.carter@medisync.dev / MediSync2024!')
    console.log('   Patient:     sarah.jenkins@medisync.dev  / MediSync2024!')
    console.log('   Coordinator: coordinator@medisync.dev    / MediSync2024!')
  } catch (err) {
    console.error('\n❌  Seed failed:', err)
    process.exit(1)
  }
}

main()
