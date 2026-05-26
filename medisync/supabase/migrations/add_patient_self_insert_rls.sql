-- Allow a patient-role profile to insert their own patients row.
--
-- Context: the mobile app calls supabase.auth.signUp() with email confirmation
-- enabled, which means no session is returned until the user confirms. The
-- subsequent patients INSERT is made by the anon role. Restricting to
-- profile_id = auth.uid() would therefore always block, so we instead check
-- that profile_id points to an existing patient-role profile. The FK
-- patients.profile_id → profiles(id) and unique(profile_id) together ensure
-- only one row per real user, and no sensitive data is exposed by this policy.
drop policy if exists "patients_self_insert" on patients;
create policy "patients_self_insert" on patients
  for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id   = profile_id
        and profiles.role = 'patient'
    )
  );

-- Backfill: create patients rows for existing mobile-registered users who have
-- a patient profile but no patients record (registered before this migration).
insert into patients (profile_id)
select id
from   profiles
where  role = 'patient'
  and  not exists (
         select 1 from patients where patients.profile_id = profiles.id
       )
on conflict (profile_id) do nothing;
