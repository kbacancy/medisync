-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: lab_orders
-- Clinician-ordered lab/diagnostic tests for a patient.
-- tests: jsonb array of { id, name, category }
-- priority: routine | stat | urgent
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists lab_orders (
  id           uuid primary key default uuid_generate_v4(),
  patient_id   uuid not null references patients(id) on delete cascade,
  clinician_id uuid not null references profiles(id),
  ordered_at   timestamptz not null default now(),
  priority     text not null default 'routine'
               check (priority in ('routine', 'stat', 'urgent')),
  tests        jsonb not null default '[]',
  notes        text,
  status       text not null default 'pending'
               check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_lab_orders_patient_id  on lab_orders(patient_id);
create index if not exists idx_lab_orders_ordered_at  on lab_orders(ordered_at desc);

alter table lab_orders enable row level security;

drop policy if exists "lab_orders_clinician_all"  on lab_orders;
drop policy if exists "lab_orders_patient_read"   on lab_orders;

-- Clinicians manage all lab orders
create policy "lab_orders_clinician_all" on lab_orders for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'clinician'
    )
  );

-- Patients read their own lab orders
create policy "lab_orders_patient_read" on lab_orders for select
  using (
    exists (
      select 1 from patients
      where patients.id = lab_orders.patient_id
        and patients.profile_id = auth.uid()
    )
  );
