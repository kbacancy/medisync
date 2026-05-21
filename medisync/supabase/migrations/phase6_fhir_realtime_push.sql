-- ─── Phase 6 Migration: FHIR Audit Log, Care Alerts, Push Subscriptions ──────

-- FHIR audit log — records every FHIR resource create/update action
CREATE TABLE IF NOT EXISTS fhir_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT       NOT NULL,
  action       TEXT        NOT NULL,
  patient_id   UUID        REFERENCES patients(id),
  payload      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Care alerts — clinical alerts surfaced to clinicians in realtime
CREATE TABLE IF NOT EXISTS care_alerts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID        REFERENCES patients(id),
  type       TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  severity   TEXT        NOT NULL,        -- 'low' | 'moderate' | 'high' | 'critical'
  is_read    BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription overrides — records DDI overrides by clinicians
CREATE TABLE IF NOT EXISTS prescription_overrides (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID        REFERENCES prescriptions(id),
  override_code   TEXT        NOT NULL,
  doctor_id       UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Push subscriptions — browser Web Push endpoints per user
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id),
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Enable Supabase Realtime on care_alerts so clinicians receive live alerts
ALTER PUBLICATION supabase_realtime ADD TABLE care_alerts;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_care_alerts_patient_id ON care_alerts (patient_id);
CREATE INDEX IF NOT EXISTS idx_care_alerts_is_read    ON care_alerts (is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_fhir_audit_patient     ON fhir_audit_log (patient_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_user          ON push_subscriptions (user_id);
