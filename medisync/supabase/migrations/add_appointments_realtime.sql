-- appointments was already in supabase_realtime — ADD TABLE is a no-op if it
-- fails with 42710. This migration only sets REPLICA IDENTITY FULL so that
-- UPDATE payloads from Supabase Realtime include ALL columns, not just the
-- primary key and changed columns. Without this, `type` and `clinician_id`
-- (which are set at INSERT and never change) are absent from UPDATE payloads,
-- causing IncomingCallListener to silently drop every real-time call event.
ALTER TABLE appointments REPLICA IDENTITY FULL;
