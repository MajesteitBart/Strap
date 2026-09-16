# Local Postgres

Strap uses Postgres 17+ (17 locally, 18 on Railway), Drizzle and Better Auth. The application connects directly from the server; browsers use authenticated app routes. There is no database REST endpoint or RLS dependency. Authorization lives in lib/authz/, with current membership, section permissions and scoped agent credentials enforced before data is returned.

## Setup

Use Node.js 22+ and Docker. Copy .env.example to .env.local, generate separate secrets for BETTER_AUTH_SECRET, STRAP_ENCRYPTION_SECRET, STRAP_VAULT_SECRET and STRAP_MAINTENANCE_SECRET, then run:

```sh
npm ci
npm run db:up
npm run db:migrate
npm run db:ping
npm run test:db
npm run dev
```

DATABASE_URL defaults in the example to postgresql://strap:strap-local-only@127.0.0.1:55433/strap. Compose binds to loopback and persists the database in its own volume. The supplied database password is for local development. BETTER_AUTH_URL and NEXT_PUBLIC_SITE_URL must both be http://localhost:3000 locally. Keep every secret in .env.local and never log it.

Resend sends verification, password reset and Company invitation emails. Email/password sign-up requires verification; configure RESEND_API_KEY and RESEND_FROM_EMAIL before trying real sign-up. Tests capture links in memory without sending mail. Password resets revoke existing sessions. Imported bcrypt hashes remain usable and upgrade on successful sign-in.

Google uses GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Reuse the existing Google app and add http://localhost:3000/api/auth/callback/google while retaining its existing production callback. X uses X_CLIENT_ID and X_CLIENT_SECRET, with /api/auth/callback/twitter. Google credential setup and live provider rehearsal are deferred by the owner; local cryptographic identity-linking tests do not replace that rehearsal.

STRAP_VAULT_SECRET is a dedicated key of at least 32 random characters. It is independent of STRAP_ENCRYPTION_SECRET, which must retain its existing value when copying agent/provider ciphertext. Back up these keys with the database: replacing a key does not rotate existing ciphertext. Vault uses AES-256-GCM bound to the item/profile and audits before reveal. Avatars are capped at 3 MiB, stored in Postgres and served through a cached image route.

## Schema and checks

db/schema/ defines 44 tables. db/migrations/0000_baseline.sql is the single squashed baseline; its final block contains eight retained atomic functions from db/functions/baseline.sql. Future schema changes use npm run db:generate -- --name=<change>. Review generated SQL before npm run db:migrate. Function edits require a SQL migration and an update to the reference file because Drizzle does not generate function migrations.

Run migrations once per release. Hosted connections require verified TLS and a transaction pooler; the driver uses one connection and disables prepared statements. Railway hosts Postgres 18 and a transaction-mode PgBouncer service. Set DATABASE_SSL_CA to its trusted certificate when using the private CA; hostname and certificate verification remain mandatory. Rotate the pooler certificate before its September 2027 expiry. Credentials and the certificate/key pair are stored in BWS under STRAP_DATABASE_* keys.

Local database scripts load this checkout's .env.local; CI uses explicit job variables. npm test skips database suites without DATABASE_URL. npm run test:db creates a random strap_test_<id> database per suite and drops only that database afterward. The local role needs CREATEDB. Existing application data is never truncated by these tests. npm run verify:local checks a running localhost app with a fresh synthetic account and cleans up its own account afterward.

The authorization inventory and negative test mapping are in .project/projects/remove-supabase/research/authorization/. The browser/API/MCP contracts and both CLI packages remain compatible.

## Retention

POST /api/internal/maintenance requires Authorization: Bearer <STRAP_MAINTENANCE_SECRET>. It removes activity older than 90 days and expired device/authorization codes, returning and logging counts only. The daily GitHub Actions workflow needs repository variable STRAP_SITE_URL and secret STRAP_MAINTENANCE_SECRET after deployment. Local authorization and pruning tests pass; no hosted cron run is claimed.

## Import rehearsal and cutover

Set STRAP_SOURCE_DATABASE_URL to the intended source connection in .env.local. The import command reads a consistent, read-only source snapshot. Vault plaintext exists only in memory while it is re-encrypted. No raw export file is written.

```sh
node scripts/migrate-from-supabase.mts
node scripts/migrate-from-supabase.mts --apply
```

The default prints counts without importing. --apply requires an empty target; a hosted target also requires --target host:port/database matching its connection string exactly. Use STRAP_SOURCE_DATABASE_SSL_CA for the source CA independently of DATABASE_SSL_CA. The importer imports in one transaction, reconciles every table and resets identity sequences. There is deliberately no force/overwrite flag. Sessions are not migrated. IDs, agent hashes and existing encrypted credentials are preserved. Generated stored columns are recomputed. Missing destination fields use baseline defaults. Unsupported source schema changes must be resolved before cutover.

Local and hosted source-copy rehearsals passed. The Railway rehearsal reconciled 2 users, 3 profiles and all 37 application tables. The PR preview uses the isolated rehearsal database; production still uses Supabase. Production import, live Google/X sign-in, real delivered emails, final authorization review, and the scheduled cutover remain release gates. The production rollback plan is to retain the old project for 30 days; it has not been paused or modified here. See .project/projects/remove-supabase/ for current task evidence and the cutover checklist.
