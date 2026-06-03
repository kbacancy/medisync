import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { MedicationTimeline } from '@/components/medications/MedicationTimeline';
import { PushNotificationSetup } from '@/components/patient/PushNotificationSetup';
import { ActiveCallBanner } from '@/components/patient/ActiveCallBanner';
import type { PrescriptionWithDispense, AdherenceLog, DispenseRecord } from '@/types';

const SEED_DISPENSE_RX1: DispenseRecord = {
  id: 'disp-seed-1',
  patient_id: 'seed-patient-1',
  prescription_id: 'rx-seed-1',
  quantity_dispensed: 30,
  days_supply: 30,
  remaining_count: 12,
  dispensed_at: new Date(Date.now() - 18 * 86_400_000).toISOString(),
  created_at: new Date(Date.now() - 18 * 86_400_000).toISOString(),
};

const SEED_DISPENSE_RX2: DispenseRecord = {
  id: 'disp-seed-2',
  patient_id: 'seed-patient-1',
  prescription_id: 'rx-seed-2',
  quantity_dispensed: 60,
  days_supply: 30,
  remaining_count: 4,
  dispensed_at: new Date(Date.now() - 27 * 86_400_000).toISOString(),
  created_at: new Date(Date.now() - 27 * 86_400_000).toISOString(),
};

const SEED_DISPENSE_RX3: DispenseRecord = {
  id: 'disp-seed-3',
  patient_id: 'seed-patient-1',
  prescription_id: 'rx-seed-3',
  quantity_dispensed: 30,
  days_supply: 30,
  remaining_count: 22,
  dispensed_at: new Date(Date.now() - 8 * 86_400_000).toISOString(),
  created_at: new Date(Date.now() - 8 * 86_400_000).toISOString(),
};

const SEED_PRESCRIPTIONS: PrescriptionWithDispense[] = [
  {
    id: 'rx-seed-1',
    patient_id: 'seed-patient-1',
    clinician_id: 'doc-seed-1',
    medication_name: 'Lisinopril',
    dosage: '10mg',
    form: 'Tablet',
    frequency: 'Once daily',
    days_supply: 30,
    refills: 5,
    start_date: '2024-01-15',
    status: 'active',
    time_of_day: ['morning'],
    instructions: 'Take 1 tablet with water before breakfast',
    medication_category: 'cardiovascular',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dispense_records: [SEED_DISPENSE_RX1],
  },
  {
    id: 'rx-seed-2',
    patient_id: 'seed-patient-1',
    clinician_id: 'doc-seed-1',
    medication_name: 'Metformin',
    dosage: '500mg',
    form: 'Tablet',
    frequency: 'Twice daily',
    days_supply: 30,
    refills: 3,
    start_date: '2024-01-01',
    status: 'active',
    time_of_day: ['morning', 'evening'],
    instructions: 'Take with food to reduce stomach upset',
    medication_category: 'diabetes',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dispense_records: [SEED_DISPENSE_RX2],
  },
  {
    id: 'rx-seed-3',
    patient_id: 'seed-patient-1',
    clinician_id: 'doc-seed-1',
    medication_name: 'Atorvastatin',
    dosage: '40mg',
    form: 'Tablet',
    frequency: 'Once daily',
    days_supply: 30,
    refills: 2,
    start_date: '2024-02-01',
    status: 'active',
    time_of_day: ['bedtime'],
    instructions: 'Take at bedtime for best effectiveness',
    medication_category: 'cardiovascular',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dispense_records: [SEED_DISPENSE_RX3],
  },
];

function inferTimeSlots(frequency: string): string[] {
  const f = frequency.toLowerCase();
  if (f.includes('twice') || f.includes('bid') || f.includes('2x')) return ['morning', 'evening'];
  if (f.includes('three') || f.includes('tid') || f.includes('3x'))
    return ['morning', 'afternoon', 'evening'];
  if (f.includes('four') || f.includes('qid') || f.includes('4x'))
    return ['morning', 'afternoon', 'evening', 'bedtime'];
  return ['morning'];
}

const SLOT_HOURS: Record<string, number> = {
  morning: 8,
  afternoon: 13,
  evening: 18,
  bedtime: 21,
};

const SLOT_MINUTES: Record<string, number> = {
  morning: 0,
  afternoon: 0,
  evening: 30,
  bedtime: 0,
};

function generateTodayLogs(
  prescriptions: PrescriptionWithDispense[],
  patientId: string
): AdherenceLog[] {
  const logs: AdherenceLog[] = [];
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  for (const rx of prescriptions) {
    const slots = rx.time_of_day?.length ? rx.time_of_day : inferTimeSlots(rx.frequency);

    for (const slot of slots) {
      const hour = SLOT_HOURS[slot] ?? 8;
      const minute = SLOT_MINUTES[slot] ?? 0;

      const scheduled = new Date(today);
      scheduled.setHours(hour, minute, 0, 0);

      logs.push({
        id: `auto-${rx.id}-${slot}-${todayStr}`,
        patient_id: patientId,
        prescription_id: rx.id,
        scheduled_time: scheduled.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }
  }

  return logs;
}

function buildSeedLogs(today: Date): AdherenceLog[] {
  const todayStr = format(today, 'yyyy-MM-dd');

  const slots: Array<{ rxId: string; hour: number; minute: number; slot: string }> = [
    { rxId: 'rx-seed-1', hour: 8, minute: 0, slot: 'morning' },
    { rxId: 'rx-seed-2', hour: 8, minute: 30, slot: 'morning' },
    { rxId: 'rx-seed-2', hour: 18, minute: 30, slot: 'evening' },
    { rxId: 'rx-seed-3', hour: 21, minute: 0, slot: 'bedtime' },
  ];

  return slots.map(({ rxId, hour, minute, slot }) => {
    const scheduled = new Date(today);
    scheduled.setHours(hour, minute, 0, 0);
    const isPast = scheduled < new Date();

    const isTaken = isPast && rxId !== 'rx-seed-2';
    const isMissed = isPast && rxId === 'rx-seed-2' && slot === 'evening';

    const status: AdherenceLog['status'] = !isPast
      ? 'pending'
      : isMissed
      ? 'missed'
      : isTaken
      ? 'taken'
      : 'pending';

    return {
      id: `seed-log-${rxId}-${slot}-${todayStr}`,
      patient_id: 'seed-patient-1',
      prescription_id: rxId,
      scheduled_time: scheduled.toISOString(),
      actual_time:
        status === 'taken'
          ? new Date(scheduled.getTime() + 7 * 60_000).toISOString()
          : undefined,
      status,
      created_at: scheduled.toISOString(),
    };
  });
}

export default async function MedicationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: patientData } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!patientData) {
    const today = new Date();
    const seedLogs = buildSeedLogs(today);
    const pendingDoses = SEED_PRESCRIPTIONS.flatMap((rx) =>
      seedLogs
        .filter((l) => l.prescription_id === rx.id && l.status === 'pending')
        .map((l) => ({ prescription: rx, scheduledTime: new Date(l.scheduled_time) }))
    );
    return (
      <>
        <PushNotificationSetup userId="seed-patient-1" pendingDoses={pendingDoses} />
        <MedicationTimeline
          prescriptions={SEED_PRESCRIPTIONS}
          adherenceLogs={seedLogs}
          patientId="seed-patient-1"
        />
      </>
    );
  }

  const patientId = patientData.id;

  // Check for an active telehealth call waiting for the patient
  const { data: activeCall } = await supabase
    .from('appointments')
    .select(`
      id,
      room_url,
      room_name,
      doctor:profiles!doctor_id(full_name)
    `)
    .eq('patient_id', patientId)
    .eq('status', 'in-call')
    .eq('type', 'telehealth')
    .maybeSingle()

  type ActiveCallRow = {
    id: string
    room_url: string | null
    room_name: string | null
    doctor: { full_name: string | null } | null
  }
  const call = activeCall as ActiveCallRow | null

  const { data: rxData } = await supabase
    .from('prescriptions')
    .select(
      `
      *,
      dispense_records (
        id,
        patient_id,
        prescription_id,
        quantity_dispensed,
        days_supply,
        remaining_count,
        dispensed_at,
        pharmacy_name,
        created_at
      )
    `
    )
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const prescriptions: PrescriptionWithDispense[] =
    rxData && rxData.length > 0
      ? (rxData as PrescriptionWithDispense[])
      : SEED_PRESCRIPTIONS;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: logData } = await supabase
    .from('adherence_logs')
    .select('*')
    .eq('patient_id', patientId)
    .gte('scheduled_time', todayStart.toISOString())
    .lte('scheduled_time', todayEnd.toISOString());

  let adherenceLogs: AdherenceLog[];

  if (logData && logData.length > 0) {
    adherenceLogs = logData as AdherenceLog[];
  } else {
    adherenceLogs = generateTodayLogs(prescriptions, patientId);

    if (adherenceLogs.length > 0) {
      const toInsert = adherenceLogs.map(
        ({ id, patient_id, prescription_id, scheduled_time, status }) => ({
          id,
          patient_id,
          prescription_id,
          scheduled_time,
          status,
        })
      );
      await supabase
        .from('adherence_logs')
        .upsert(toInsert, { onConflict: 'id', ignoreDuplicates: true });
    }
  }

  const pendingDoses = prescriptions.flatMap((rx) =>
    adherenceLogs
      .filter((l) => l.prescription_id === rx.id && l.status === 'pending')
      .map((l) => ({ prescription: rx, scheduledTime: new Date(l.scheduled_time) }))
  );

  return (
    <>
      <PushNotificationSetup userId={user.id} pendingDoses={pendingDoses} />
      {call?.room_url && call?.room_name && (
        <ActiveCallBanner
          appointmentId={call.id}
          roomUrl={call.room_url}
          roomName={call.room_name}
          doctorName={call.doctor?.full_name ?? 'your doctor'}
        />
      )}
      <MedicationTimeline
        prescriptions={prescriptions}
        adherenceLogs={adherenceLogs}
        patientId={patientId}
      />
    </>
  );
}
