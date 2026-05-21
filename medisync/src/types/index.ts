export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type AppointmentType = 'telehealth' | 'in_person';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'clinician' | 'patient';
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  profile_id: string;
  date_of_birth: string;
  gender: string;
  blood_type?: string;
  blood_pressure?: string;
  heart_rate?: number;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Prescription {
  id: string;
  patient_id: string;
  clinician_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  days_supply: number;
  refills: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'discontinued' | 'completed';
  ndc_code?: string;
  created_at: string;
  updated_at: string;
}

export interface AdherenceLog {
  id: string;
  patient_id: string;
  prescription_id: string;
  scheduled_time: string;
  actual_time?: string;
  status: 'pending' | 'taken' | 'skipped' | 'snoozed' | 'missed' | 'late';
  skip_reason?: string;
  snooze_until?: string;
  taken_at?: string;
  created_at: string;
}

export interface DispenseRecord {
  id: string;
  patient_id: string;
  prescription_id: string;
  quantity_dispensed: number;
  days_supply: number;
  remaining_count: number;
  dispensed_at: string;
  pharmacy_name?: string;
  created_at: string;
}

export interface PrescriptionWithDispense extends Prescription {
  time_of_day?: string[];
  instructions?: string;
  medication_category?: string;
  form?: string;
  dispense_records?: DispenseRecord[];
}

export interface PDCScore {
  id: string;
  patient_id: string;
  prescription_id: string;
  score: number;
  period_start: string;
  period_end: string;
  calculated_at: string;
}

export interface Appointment {
  id: string;
  clinician_id: string;
  patient_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  patient?: Profile;
}

export interface DrugInteraction {
  id: string;
  drug_a: string;
  drug_b: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface PatientWithPDC {
  id: string;
  full_name: string;
  risk_level: RiskLevel;
  pdc_score: number;
  last_activity: string;
}

export interface CareAlert {
  id: string;
  patient_id: string;
  type: string;
  message: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
}
