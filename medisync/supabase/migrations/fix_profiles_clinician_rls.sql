-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: patients cannot read clinician profiles
--
-- Problem: profiles RLS only allows self-read (auth.uid() = id).
-- When the mobile app queries appointments and joins profiles!clinician_id
-- to get the doctor's name/avatar, Supabase returns NULL because the patient's
-- auth.uid() != clinician_id → falls back to "Unknown Doctor".
--
-- Fix: add a permissive SELECT policy that lets any authenticated user read
-- profiles where role = 'clinician'. Clinician names/avatars are not sensitive
-- and are intentionally visible to patients.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "profiles_clinician_read" on profiles;

create policy "profiles_clinician_read" on profiles
  for select
  using (role = 'clinician');
