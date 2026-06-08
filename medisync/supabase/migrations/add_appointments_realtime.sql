-- Enable Supabase Realtime on appointments so IncomingCallListener receives
-- status-change events (e.g. 'in-call') without polling.
--
-- The phase6 migration added care_alerts to supabase_realtime, which converted
-- the publication from FOR ALL TABLES to an explicit table list. appointments
-- was never added, so postgres_changes subscriptions on that table were silently
-- receiving no events.
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
