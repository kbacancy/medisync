-- =============================================================================
-- MediSync — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: all statements use IF NOT EXISTS / IF NOT EXISTS guards.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  create type risk_level as enum ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_type as enum ('telehealth', 'in_person');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show', 'in-call');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prescription_status as enum ('active', 'discontinued', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type adherence_status as enum ('pending', 'taken', 'skipped', 'snoozed', 'missed', 'late');
exception when duplicate_object then null; end $$;

do $$ begin
  create type interaction_severity as enum ('mild', 'moderate', 'severe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('clinician', 'patient');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: profiles
-- Extends Supabase auth.users — one row per user account.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        user_role not null default 'patient',
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: patients
-- Clinical record linked to a profile (patients only).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists patients (
  id                  uuid primary key default uuid_generate_v4(),
  profile_id          uuid not null references profiles(id) on delete cascade,
  assigned_doctor_id  uuid references profiles(id) on delete set null,
  date_of_birth       date,
  gender              text not null default '',
  blood_type          text,
  blood_pressure      text,
  heart_rate          integer,
  risk_level          risk_level not null default 'LOW',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (profile_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: prescriptions
-- One row per issued prescription. Includes Phase-5 columns.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists prescriptions (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references patients(id) on delete cascade,
  clinician_id     uuid not null references profiles(id) on delete restrict,
  medication_name  text not null,
  dosage           text not null default '',
  strength         text,                        -- alias for dosage / UI label
  form             text,                        -- Tablet, Capsule, Liquid, Injection
  frequency        text not null default '',
  instructions     text,
  time_of_day      text[] not null default '{}',
  days_supply      integer not null default 30,
  refills          integer not null default 0,
  start_date       date not null,
  end_date         date,
  status           prescription_status not null default 'active',
  rxcui            text,
  ndc_code         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Phase-5 columns — safe to run even if the table already existed without them
alter table prescriptions add column if not exists form         text;
alter table prescriptions add column if not exists strength     text;
alter table prescriptions add column if not exists instructions text;
alter table prescriptions add column if not exists time_of_day  text[] not null default '{}';
alter table prescriptions add column if not exists rxcui        text;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: dispense_records
-- Pharmacy fill events. remaining_count drives inventory display.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists dispense_records (
  id                  uuid primary key default uuid_generate_v4(),
  patient_id          uuid not null references patients(id) on delete cascade,
  prescription_id     uuid not null references prescriptions(id) on delete cascade,
  quantity_dispensed  integer not null default 30,
  days_supply         integer not null default 30,
  remaining_count     integer not null default 30,
  dispensed_at        timestamptz not null default now(),
  pharmacy_name       text,
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: adherence_logs
-- One row per scheduled dose event.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists adherence_logs (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references patients(id) on delete cascade,
  prescription_id  uuid not null references prescriptions(id) on delete cascade,
  scheduled_time   timestamptz not null,
  actual_time      timestamptz,
  status           adherence_status not null default 'pending',
  skip_reason      text,
  snooze_until     timestamptz,
  taken_at         timestamptz,           -- legacy alias for actual_time
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: pdc_scores
-- Cached PDC per prescription. Upserted on every dose action.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pdc_scores (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references patients(id) on delete cascade,
  prescription_id  uuid not null references prescriptions(id) on delete cascade,
  score            integer not null check (score >= 0 and score <= 100),
  period_start     timestamptz not null,
  period_end       timestamptz not null,
  calculated_at    timestamptz not null default now(),
  unique (patient_id, prescription_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: appointments
-- Scheduled telehealth or in-person visits.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists appointments (
  id                uuid primary key default uuid_generate_v4(),
  clinician_id      uuid not null references profiles(id) on delete restrict,
  patient_id        uuid not null references patients(id) on delete cascade,
  scheduled_at      timestamptz not null,
  duration_minutes  integer not null default 30,
  type              appointment_type not null default 'telehealth',
  reason            text not null default '',
  status            appointment_status not null default 'scheduled',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: drug_interactions  [Phase 5]
-- Reference table of known DDI pairs. Seeded below.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists drug_interactions (
  id           uuid primary key default uuid_generate_v4(),
  drug_a       text not null,
  drug_b       text not null,
  severity     interaction_severity not null,
  description  text not null,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: prescription_overrides  [Phase 5]
-- Audit trail when a clinician proceeds past a DDI warning.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists prescription_overrides (
  id               uuid primary key default uuid_generate_v4(),
  prescription_id  uuid not null references prescriptions(id) on delete cascade,
  override_code    text not null,
  clinician_id     uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_patients_profile_id         on patients(profile_id);
create index if not exists idx_patients_assigned_doctor    on patients(assigned_doctor_id);
create index if not exists idx_prescriptions_patient_id    on prescriptions(patient_id);
create index if not exists idx_prescriptions_clinician_id  on prescriptions(clinician_id);
create index if not exists idx_prescriptions_status        on prescriptions(status);
create index if not exists idx_adherence_patient_id        on adherence_logs(patient_id);
create index if not exists idx_adherence_prescription_id   on adherence_logs(prescription_id);
create index if not exists idx_adherence_scheduled_time    on adherence_logs(scheduled_time);
create index if not exists idx_dispense_patient_id         on dispense_records(patient_id);
create index if not exists idx_dispense_prescription_id    on dispense_records(prescription_id);
create index if not exists idx_pdc_patient_id              on pdc_scores(patient_id);
create index if not exists idx_appointments_patient_id     on appointments(patient_id);
create index if not exists idx_appointments_clinician_id   on appointments(clinician_id);
create index if not exists idx_appointments_scheduled_at   on appointments(scheduled_at);
create index if not exists idx_overrides_prescription_id   on prescription_overrides(prescription_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles              enable row level security;
alter table patients              enable row level security;
alter table prescriptions         enable row level security;
alter table dispense_records      enable row level security;
alter table adherence_logs        enable row level security;
alter table pdc_scores            enable row level security;
alter table appointments          enable row level security;
alter table drug_interactions     enable row level security;
alter table prescription_overrides enable row level security;

-- profiles: users can read/write their own row
drop policy if exists "profiles_self_read"   on profiles;
drop policy if exists "profiles_self_write"  on profiles;
create policy "profiles_self_read"  on profiles for select using (auth.uid() = id);
create policy "profiles_self_write" on profiles for update using (auth.uid() = id);

-- profiles INSERT: permissive policy so the handle_new_user trigger can
-- insert without a JWT context. Safe because profiles.id has FK → auth.users(id).
drop policy if exists "profiles_insert_own"  on profiles;
drop policy if exists "profiles_insert_auth" on profiles;
create policy "profiles_insert_auth" on profiles
  for insert with check (true);

-- patients: clinicians can read all; patients read their own
drop policy if exists "patients_clinician_read" on patients;
drop policy if exists "patients_self_read"      on patients;
create policy "patients_clinician_read" on patients for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );
create policy "patients_self_read" on patients for select
  using (profile_id = auth.uid());

-- patients: clinicians can insert/update
drop policy if exists "patients_clinician_write" on patients;
create policy "patients_clinician_write" on patients for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );

-- prescriptions: clinicians full access; patients read their own
drop policy if exists "prescriptions_clinician_all" on prescriptions;
drop policy if exists "prescriptions_patient_read"  on prescriptions;
create policy "prescriptions_clinician_all" on prescriptions for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );
create policy "prescriptions_patient_read" on prescriptions for select
  using (
    exists (
      select 1 from patients
      where patients.id = prescriptions.patient_id
        and patients.profile_id = auth.uid()
    )
  );

-- adherence_logs: patients manage their own; clinicians read all
drop policy if exists "adherence_patient_all"       on adherence_logs;
drop policy if exists "adherence_clinician_read"    on adherence_logs;
create policy "adherence_patient_all" on adherence_logs for all
  using (
    exists (
      select 1 from patients
      where patients.id = adherence_logs.patient_id
        and patients.profile_id = auth.uid()
    )
  );
create policy "adherence_clinician_read" on adherence_logs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );

-- dispense_records: clinicians full; patients read own
drop policy if exists "dispense_clinician_all"   on dispense_records;
drop policy if exists "dispense_patient_read"    on dispense_records;
create policy "dispense_clinician_all" on dispense_records for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );
create policy "dispense_patient_read" on dispense_records for select
  using (
    exists (
      select 1 from patients
      where patients.id = dispense_records.patient_id
        and patients.profile_id = auth.uid()
    )
  );

-- pdc_scores: same pattern
drop policy if exists "pdc_clinician_all"    on pdc_scores;
drop policy if exists "pdc_patient_read"     on pdc_scores;
create policy "pdc_clinician_all" on pdc_scores for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );
create policy "pdc_patient_read" on pdc_scores for select
  using (
    exists (
      select 1 from patients
      where patients.id = pdc_scores.patient_id
        and patients.profile_id = auth.uid()
    )
  );

-- appointments: clinicians full; patients read own
drop policy if exists "appt_clinician_all"   on appointments;
drop policy if exists "appt_patient_read"    on appointments;
create policy "appt_clinician_all" on appointments for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );
create policy "appt_patient_read" on appointments for select
  using (
    exists (
      select 1 from patients
      where patients.id = appointments.patient_id
        and patients.profile_id = auth.uid()
    )
  );

-- drug_interactions: readable by all authenticated users; write via service role only
drop policy if exists "ddi_authenticated_read" on drug_interactions;
create policy "ddi_authenticated_read" on drug_interactions for select
  using (auth.role() = 'authenticated');

-- prescription_overrides: clinicians full; patients cannot access
drop policy if exists "overrides_clinician_all" on prescription_overrides;
create policy "overrides_clinician_all" on prescription_overrides for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on auth.users insert
-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER requires SET search_path = public so the user_role enum
-- (defined in the public schema) is found at runtime. Without it, Supabase
-- uses a restricted search_path that omits public, causing a type-lookup
-- failure which GoTrue wraps as "Database error creating new user".
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient'::user_role)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: updated_at maintenance
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at     on profiles;
drop trigger if exists set_patients_updated_at     on patients;
drop trigger if exists set_prescriptions_updated_at on prescriptions;
drop trigger if exists set_appointments_updated_at  on appointments;

create trigger set_profiles_updated_at      before update on profiles      for each row execute function set_updated_at();
create trigger set_patients_updated_at      before update on patients      for each row execute function set_updated_at();
create trigger set_prescriptions_updated_at before update on prescriptions for each row execute function set_updated_at();
create trigger set_appointments_updated_at  before update on appointments  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: drug_interactions
-- Insert only if table is empty to avoid duplicates on re-run.
-- ─────────────────────────────────────────────────────────────────────────────
insert into drug_interactions (drug_a, drug_b, severity, description)
select * from (values
  ('Warfarin',      'Aspirin',          'severe'::interaction_severity,   'Concurrent use significantly increases bleeding risk due to additive anticoagulant effects. Monitor INR closely and assess bleeding risk before prescribing.'),
  ('Simvastatin',   'Amiodarone',       'severe'::interaction_severity,   'Amiodarone inhibits CYP3A4, dramatically increasing simvastatin plasma levels. Risk of myopathy and rhabdomyolysis — consider alternative statin.'),
  ('Sertraline',    'Tramadol',         'severe'::interaction_severity,   'Risk of serotonin syndrome. Both agents increase serotonergic activity — the combination can be life-threatening. Avoid concurrent use.'),
  ('Metoprolol',    'Verapamil',        'severe'::interaction_severity,   'Additive depression of AV nodal conduction causes severe bradycardia and heart block. Concurrent use is generally contraindicated.'),
  ('Ciprofloxacin', 'Tizanidine',       'severe'::interaction_severity,   'Ciprofloxacin potently inhibits CYP1A2, causing dramatic tizanidine level elevation. Risk of profound hypotension and excessive sedation.'),
  ('Lisinopril',    'Potassium',        'moderate'::interaction_severity, 'ACE inhibitors reduce potassium excretion. Concurrent supplementation may cause hyperkalemia — monitor serum electrolytes regularly.'),
  ('Metformin',     'Alcohol',          'moderate'::interaction_severity, 'Alcohol potentiates metformin-induced lactic acidosis risk. Advise patients to avoid excessive alcohol consumption.'),
  ('Fluconazole',   'Warfarin',         'severe'::interaction_severity,   'Fluconazole inhibits CYP2C9, markedly elevating warfarin levels and INR. Dose reduction and close monitoring required.'),
  ('Clarithromycin','Simvastatin',      'severe'::interaction_severity,   'Clarithromycin inhibits CYP3A4, increasing simvastatin exposure up to 10-fold. Suspend statin during antibiotic course.'),
  ('Clopidogrel',   'Omeprazole',       'moderate'::interaction_severity, 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation and antiplatelet effect. Consider pantoprazole as an alternative PPI.')
) as t(drug_a, drug_b, severity, description)
where not exists (select 1 from drug_interactions limit 1);
