-- Allow clinicians to read patient profiles.
--
-- The existing profiles_self_read policy only lets a user read their own row.
-- profiles_clinician_read lets anyone read rows where role = 'clinician'.
-- Neither covers the case where a clinician joins patients → profiles to display
-- patient names — that join returns NULL because the clinician UID ≠ patient UID.
--
-- This policy adds the missing read access so the patients list, dashboard
-- "Recent Patients" section, and schedule page can resolve patient names.

drop policy if exists "profiles_patient_read_by_clinician" on profiles;

create policy "profiles_patient_read_by_clinician" on profiles
  for select
  using (
    role = 'patient'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'clinician'
    )
  );
