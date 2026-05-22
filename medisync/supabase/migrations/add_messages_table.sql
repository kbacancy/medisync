-- ─── Messages — clinician ↔ patient secure messaging ─────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('clinician', 'patient')),
  body        TEXT        NOT NULL CHECK (char_length(body) > 0),
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_patient_created ON messages (patient_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Clinicians can read and write all messages
DROP POLICY IF EXISTS "messages_clinician_all" ON messages;
CREATE POLICY "messages_clinician_all" ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND   profiles.role = 'clinician'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND   profiles.role = 'clinician'
    )
  );

-- Patients can read and send messages in their own thread
DROP POLICY IF EXISTS "messages_patient_own" ON messages;
CREATE POLICY "messages_patient_own" ON messages FOR ALL
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE profile_id = auth.uid()
    )
    AND sender_role = 'patient'
  );

-- Surface new messages to all subscribers in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
