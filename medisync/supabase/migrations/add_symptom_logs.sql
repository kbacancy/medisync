-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: symptom_logs
-- Patient-reported symptom entries powering the "Recent History" EHR panel.
-- type = 'headache' | 'sleep'
-- value: headache → severity 1–10; sleep → 1 (POOR), 2 (FAIR), 3 (GOOD)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists symptom_logs (
  id          uuid primary key default uuid_generate_v4(),
  patient_id  uuid not null references patients(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  type        text not null check (type in ('headache', 'sleep')),
  value       integer not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_symptom_logs_patient_id    on symptom_logs(patient_id);
create index if not exists idx_symptom_logs_type_logged   on symptom_logs(type, logged_at);

alter table symptom_logs enable row level security;

drop policy if exists "symptom_patient_all"    on symptom_logs;
drop policy if exists "symptom_clinician_read" on symptom_logs;

-- Patients manage their own entries
create policy "symptom_patient_all" on symptom_logs for all
  using (
    exists (
      select 1 from patients
      where patients.id = symptom_logs.patient_id
        and patients.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from patients
      where patients.id = symptom_logs.patient_id
        and patients.profile_id = auth.uid()
    )
  );

-- Clinicians read all
create policy "symptom_clinician_read" on symptom_logs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );
