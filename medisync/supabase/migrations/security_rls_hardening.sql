-- ─── Security Hardening: Missing RLS Policies ────────────────────────────────
-- Findings 1.1, 1.2, 1.3, 1.4 from the security audit (2026-06-09)

-- ── 1. care_alerts ───────────────────────────────────────────────────────────
ALTER TABLE care_alerts ENABLE ROW LEVEL SECURITY;

-- Clinicians can read and manage all care alerts
CREATE POLICY "care_alerts_clinician_all" ON care_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('clinician', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('clinician', 'coordinator')
    )
  );

-- Patients can read their own alerts only
CREATE POLICY "care_alerts_patient_select" ON care_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE id = care_alerts.patient_id
        AND profile_id = auth.uid()
    )
  );

-- ── 2. fhir_audit_log ────────────────────────────────────────────────────────
ALTER TABLE fhir_audit_log ENABLE ROW LEVEL SECURITY;

-- Clinicians can read all FHIR audit entries
CREATE POLICY "fhir_audit_clinician_select" ON fhir_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('clinician', 'coordinator')
    )
  );

-- Service-role writes bypass RLS — no INSERT policy needed for the API route
-- Patients cannot read FHIR audit entries (clinician-only record)

-- ── 3. prescription_overrides ────────────────────────────────────────────────
ALTER TABLE prescription_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescription_overrides_clinician_all" ON prescription_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('clinician', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('clinician', 'coordinator')
    )
  );

-- ── 4. adherence_logs: add WITH CHECK to patient policy ──────────────────────
-- Drop and recreate to add WITH CHECK (prevents cross-patient INSERT)
DROP POLICY IF EXISTS "adherence_patient_all" ON adherence_logs;

CREATE POLICY "adherence_patient_all" ON adherence_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE id = adherence_logs.patient_id
        AND profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE id = adherence_logs.patient_id
        AND profile_id = auth.uid()
    )
  );
