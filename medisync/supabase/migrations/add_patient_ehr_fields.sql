-- ─── Add EHR fields to patients table ───────────────────────────────────────
-- allergies: known drug / food / environmental allergies
-- diagnoses: historical diagnosis labels (ICD-style free text for now)
-- Both default to empty array so existing rows are unaffected.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS allergies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diagnoses text[] NOT NULL DEFAULT '{}';
