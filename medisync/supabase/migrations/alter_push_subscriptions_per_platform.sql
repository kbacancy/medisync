-- Allow one push token per user per platform (iOS + Android can coexist).
--
-- The original schema had UNIQUE(user_id) which allowed only ONE device per
-- patient. When a patient registered on iOS first, the Android token could
-- never be stored, so call notifications were only delivered to iOS.
--
-- New constraint: UNIQUE(user_id, platform) — one row per platform per user.

-- Drop the old single-device constraint
ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- Add the per-platform constraint
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_platform_key
  UNIQUE (user_id, platform);

-- Remove all iOS tokens that came from Expo Go (they all start with
-- ExponentPushToken and the device no longer has Expo Go installed).
-- Android tokens will be re-registered on next login; iOS tokens will
-- be re-created if the patient installs Expo Go on iOS again.
DELETE FROM push_subscriptions WHERE platform = 'ios';

NOTIFY pgrst, 'reload schema';
