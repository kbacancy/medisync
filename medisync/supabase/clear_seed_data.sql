-- ─────────────────────────────────────────────────────────────────────────────
-- MediSync — Clear all seeded demo data
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Deletes in FK-safe order.  Auth users are removed last so cascades in
-- auth.identities / auth.sessions are handled by Supabase internals.
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed user emails (all accounts created by seed.ts)
DO $$
DECLARE
  seed_emails TEXT[] := ARRAY[
    'dr.james.carter@medisync.dev',
    'coordinator@medisync.dev',
    'sarah.jenkins@medisync.dev',
    'james.wilson@medisync.dev',
    'aisha.johnson@medisync.dev',
    'robert.chen@medisync.dev'
  ];
  seed_user_ids UUID[];
  seed_patient_ids UUID[];
BEGIN

  -- Resolve auth user IDs for these emails
  SELECT ARRAY(SELECT id FROM auth.users WHERE email = ANY(seed_emails))
  INTO seed_user_ids;

  RAISE NOTICE 'Found % seeded auth users', array_length(seed_user_ids, 1);

  -- Resolve patient IDs (for tables that reference patients.id directly)
  SELECT ARRAY(SELECT id FROM patients WHERE profile_id = ANY(seed_user_ids))
  INTO seed_patient_ids;

  RAISE NOTICE 'Found % seeded patient records', array_length(seed_patient_ids, 1);

  -- 1. Adherence logs
  DELETE FROM adherence_logs WHERE patient_id = ANY(seed_patient_ids);
  RAISE NOTICE '  adherence_logs   cleared';

  -- 2. PDC scores
  DELETE FROM pdc_scores WHERE patient_id = ANY(seed_patient_ids);
  RAISE NOTICE '  pdc_scores       cleared';

  -- 3. Dispense records
  DELETE FROM dispense_records WHERE patient_id = ANY(seed_patient_ids);
  RAISE NOTICE '  dispense_records cleared';

  -- 4. Care alerts
  DELETE FROM care_alerts WHERE patient_id = ANY(seed_patient_ids);
  RAISE NOTICE '  care_alerts      cleared';

  -- 5. FHIR audit log (Phase 6)
  DELETE FROM fhir_audit_log WHERE patient_id = ANY(seed_patient_ids);
  RAISE NOTICE '  fhir_audit_log   cleared';

  -- 6. Messages
  DELETE FROM messages WHERE patient_id = ANY(seed_patient_ids);
  RAISE NOTICE '  messages         cleared';

  -- 7. Symptom logs (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'symptom_logs') THEN
    DELETE FROM symptom_logs WHERE patient_id = ANY(seed_patient_ids);
    RAISE NOTICE '  symptom_logs     cleared';
  END IF;

  -- 8. Lab orders (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_orders') THEN
    DELETE FROM lab_orders WHERE patient_id = ANY(seed_patient_ids);
    RAISE NOTICE '  lab_orders       cleared';
  END IF;

  -- 9. Appointments (references both patient_id and clinician_id)
  DELETE FROM appointments WHERE patient_id = ANY(seed_patient_ids)
                              OR clinician_id = ANY(seed_user_ids);
  RAISE NOTICE '  appointments     cleared';

  -- 10. Prescriptions
  DELETE FROM prescriptions WHERE patient_id = ANY(seed_patient_ids);
  RAISE NOTICE '  prescriptions    cleared';

  -- 11. Push subscriptions tied to seed users
  DELETE FROM push_subscriptions WHERE user_id = ANY(seed_user_ids);
  RAISE NOTICE '  push_subscriptions cleared';

  -- 12. Patient records
  DELETE FROM patients WHERE profile_id = ANY(seed_user_ids);
  RAISE NOTICE '  patients         cleared';

  -- 13. Drug interactions (reference data seeded by seed.ts + schema.sql)
  --     These are needed for DDI checking — remove only if you want a fully
  --     blank slate.  Re-run schema.sql INSERT block to restore them.
  DELETE FROM drug_interactions;
  RAISE NOTICE '  drug_interactions cleared';

  -- 14. Profiles
  DELETE FROM profiles WHERE id = ANY(seed_user_ids);
  RAISE NOTICE '  profiles         cleared';

  -- 15. Auth users — Supabase cascades to auth.identities / auth.sessions
  DELETE FROM auth.users WHERE email = ANY(seed_emails);
  RAISE NOTICE '  auth.users       cleared';

  RAISE NOTICE '';
  RAISE NOTICE '✅  All seeded data removed.  Database is clean for real testing.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Register a new clinician account via /register';
  RAISE NOTICE '  2. Register patient accounts via /register';
  RAISE NOTICE '  3. If DDI checking is needed, re-run the drug_interactions INSERT';
  RAISE NOTICE '     block from supabase/schema.sql (bottom of file).';

END $$;
