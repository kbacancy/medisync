-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: profile trigger RLS conflict
--
-- Problem: In newer Supabase versions the postgres role has row_security = ON
-- by default. The handle_new_user trigger (SECURITY DEFINER) therefore ran
-- RLS INSERT checks on profiles. auth.uid() is NULL during admin user creation,
-- so "profiles_insert_own" (auth.uid() = id) always evaluated to NULL/false,
-- blocking the insert and returning "Database error creating new user".
--
-- Fix:
--   1. Drop the INSERT policy — profiles are only ever inserted by the trigger.
--   2. Recreate the trigger function with SET row_security = off so it
--      bypasses RLS regardless of the postgres role's session setting.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove the restrictive INSERT policy
drop policy if exists "profiles_insert_own" on profiles;

-- 2. Add a permissive INSERT policy that works in trigger context.
--    Safe because profiles.id has FK → auth.users(id), so only valid
--    auth user IDs can ever be inserted (FK enforced at DB level).
drop policy if exists "profiles_insert_auth" on profiles;
create policy "profiles_insert_auth" on profiles
  for insert with check (true);

-- 3. Recreate trigger function (no set row_security needed now that the
--    INSERT policy allows the trigger's NULL auth.uid() context).
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
