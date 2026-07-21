-- On the hosted project this schema was applied via `supabase db push` without
-- Supabase's default privileges taking effect: no table in public carried
-- grants for the Data API roles, so every PostgREST request failed with
-- "permission denied" (even service_role). Restore the standard Supabase
-- grants explicitly, and set default privileges so tables added by future
-- migrations don't regress.
--
-- Deliberately scoped to tables and sequences only: functions keep Postgres'
-- implicit PUBLIC execute default, which preserves the targeted revokes in
-- 20260706120641_company_p0_hardening and
-- 20260706121522_revoke_credit_spend_total_client_execute. Row access is
-- still governed by RLS; these grants only clear the table-privilege layer.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
