-- Manual scanner history is private to its submitting user. The legacy broker
-- policy queried an unrelated table and made even owner reads/inserts fail when
-- authenticated had no access to that table. Do not widen table privileges.
BEGIN;
DROP POLICY IF EXISTS "Brokers can see compliance results for their agents" ON public.compliance_scans;
-- Existing owner policies keep auth.uid() = user_id for reads and writes.
NOTIFY pgrst, 'reload schema';
COMMIT;
