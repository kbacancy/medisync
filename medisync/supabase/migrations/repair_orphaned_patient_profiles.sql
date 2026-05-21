-- Repair patients whose profile_id has no matching row in profiles.
--
-- Root cause: when a pre-existing auth user is linked via /api/patients/create,
-- the handle_new_user trigger does NOT re-fire, so no profiles row is created.
-- PostgREST treats NOT NULL FKs as INNER JOINs, silently dropping those patients
-- from clinician queries.
--
-- This is safe to re-run: ON CONFLICT (id) DO UPDATE only overwrites blank names.

insert into profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    split_part(u.email, '@', 1)
  ),
  'patient'::user_role
from auth.users u
inner join patients p on p.profile_id = u.id
where not exists (
  select 1 from profiles pr where pr.id = u.id
)
on conflict (id) do update
  set full_name = excluded.full_name
  where profiles.full_name = '';
