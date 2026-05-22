-- Migrate push_subscriptions from browser Web Push schema to Expo mobile token schema.
--
-- The phase6 migration created this table for browser Web Push (endpoint / p256dh / auth).
-- Expo mobile push requires a token + platform layout instead.
-- Old web-push rows cannot be used for Expo delivery, so we truncate before altering.

TRUNCATE TABLE push_subscriptions;

-- Drop the browser Web Push columns
ALTER TABLE push_subscriptions
  DROP COLUMN IF EXISTS endpoint,
  DROP COLUMN IF EXISTS p256dh,
  DROP COLUMN IF EXISTS auth,
  DROP COLUMN IF EXISTS created_at;

-- Add the Expo token columns (nullable first so the ALTER succeeds on Postgres < 11)
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS token      TEXT,
  ADD COLUMN IF NOT EXISTS platform   TEXT CHECK (platform IN ('ios', 'android', 'web')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Table is empty after TRUNCATE, so NOT NULL is safe to enforce now
ALTER TABLE push_subscriptions
  ALTER COLUMN token    SET NOT NULL,
  ALTER COLUMN platform SET NOT NULL,
  ALTER COLUMN user_id  SET NOT NULL;

-- Index for the stale-token cleanup DELETE in sendCallPush
CREATE INDEX IF NOT EXISTS idx_push_sub_token ON push_subscriptions (token);

-- RLS: patients manage their own token; service role bypasses for push delivery
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subs_self_all" ON push_subscriptions;
CREATE POLICY "push_subs_self_all" ON push_subscriptions FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tell PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
