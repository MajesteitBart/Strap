---
name: Remove Supabase
slug: remove-supabase
owner: MajesteitBart
status: active
created: 2026-09-13T17:49:09Z
updated: 2026-09-13T18:09:46Z
outcome: Strap runs on plain Postgres with first-party auth, secrets, storage, and scheduling, with no Supabase dependency, service, or credential left in code, config, docs, or production.
uncertainty: high
probe_required: true
probe_status: passed
probe_decision_rationale: Local Postgres transactions, bcrypt migration and signed Google identity-linking probes passed. Live providers and hosted rehearsal remain explicit release gates.
operating_mode: multi-stream
---

# Spec: Remove Supabase

## Executive Summary
Strap depends on Supabase for Postgres, authentication, row-level security, realtime presence, avatar storage, Vault secrets, scheduled retention, auth emails, and the migration CLI. This project replaces each of those with first-party code on plain Postgres: Drizzle for data access, Better Auth for identity, application-level encryption for Vault, Postgres-backed avatars, polling instead of realtime, and a scheduled maintenance route. Production holds 2 users and 3 profiles, so the cutover is one scripted export and import inside a short maintenance window.

## Problem and Users
Supabase couples Strap to a vendor-specific client, auth service, cookie model, RLS policy set, and CLI. Bart wants the stack free of that dependency. Personal and Company users must keep their accounts, profiles, agent connections, and secrets. Connected agents must keep working through MCP and OAuth without reconfiguration. Self-hosters need a setup that requires only Postgres plus the existing optional providers.

## Outcome and Success Metrics
- `@supabase/*` no longer appears in `package.json`, lockfiles, source, CI, or deploy configuration.
- `strap.bvdm.ai` serves the migrated data. Both existing users sign in with their current method. All 3 OAuth tokens and 4 MCP clients keep working without re-authorization.
- Every table, function, and authorization rule has a replacement with tests. No route loses a check that RLS enforced before.
- `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, both CLI packages, and a database integration suite pass in CI against a Postgres service container.
- The Supabase project is paused after cutover and deleted after a 30-day rollback window.

## User Stories
- US-001: As a Personal user, I sign in with my existing email and password or Google account and find my profile, sections, history, and connections unchanged.
- US-002: As a Company owner, my members, roles, section permissions, invites, and GitHub sync keep working.
- US-003: As a connected agent, my OAuth or `strap_key_` credential still resolves the same profile and mode through `/mcp`.
- US-004: As a Vault user, my stored secret is still revealable only through the audited reveal flow.
- US-005: As a self-hoster, I run Strap with a `DATABASE_URL`, an auth secret, and optional provider keys, without a Supabase account.

## Acceptance Scenarios
- AC-001: Given the migrated database, when each existing user signs in with password or Google, then they land in `/file` with the same profile id and content.
- AC-002: Given a connected MCP client with an existing OAuth token, when it calls `read_strap`, then it receives the same sections and permissions as before cutover.
- AC-003: Given a Company member, when they request a section they may not see, then the API and MCP refuse exactly as the RLS policies did. Negative tests cover each former policy family.
- AC-004: Given the single Vault item, when its owner reveals it after cutover, then the plaintext matches the pre-cutover value and an audit row is written.
- AC-005: Given a clean checkout with only `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STRAP_ENCRYPTION_SECRET`, and `NEXT_PUBLIC_SITE_URL`, when `npm run db:migrate` and `npm run dev` run, then sign-up, onboarding, and the editor work.
- AC-006: Given the CI workflow, when a pull request runs, then migrations apply to a fresh Postgres service and the integration tests pass.
- AC-007: Given the retention job, when it runs, then activity rows older than 90 days are deleted and the run is logged.

## Scope
### In Scope
Postgres hosting, Drizzle schema and migrations, Better Auth with email/password, Google, and X, verification and reset emails through Resend, session plumbing, user profile data, account deletion, every persistence call in `lib/` and `app/`, explicit authorization replacing RLS, Vault encryption, avatars, presence removal, retention job, health probes, export and import tooling, production cutover, Supabase decommission, dependency and configuration removal, tests, docs, marketing copy, context pack, and OpenWiki sources.
### Out of Scope
Renaming Creed-named tables or identifiers. Changing the MCP or OAuth contract. New features. A realtime replacement service. Billing history cleanup. Changes to `packages/strap` or `packages/creed-cli` beyond documentation. Hosting changes for the Next.js app itself.

## Functional Requirements
- Preserve every user id, profile id, token hash, and ciphertext so foreign keys and agent credentials remain valid.
- Accept existing bcrypt password hashes at sign-in and rehash on the first successful login.
- Link Google identities from the export so social sign-in resolves the existing user instead of creating a duplicate.
- Send verification and reset emails with the redesigned templates through Resend.
- Enforce every former RLS rule in application code with a documented policy-to-guard matrix.
- Keep the Vault plaintext boundary: lists return metadata, reveal requires a durable audit row first.
- Keep `/api/health` reporting database and auth components with the same JSON shape.
- Provide `npm run db:generate`, `npm run db:migrate`, and a local Postgres through Docker Compose.

## Non-Functional Requirements
- Strict TypeScript, no `any`, no `console.log`.
- No service credentials in clients, logs, tests, or commits.
- Serverless-safe connection handling on Netlify: pooled connection string, one connection per function instance.
- Query count per request must not exceed the current Supabase fan-out. Measure `/file` and `/mcp` before and after.
- Migrations are idempotent, reviewable SQL.

## Assumptions
- Neon hosts the new Postgres (D-1) unless Bart chooses Railway.
- Company presence hints can be dropped (D-3).
- The Google and X OAuth apps can be re-pointed to new callback URLs.
- Netlify remains the app host.

## Needs Clarification
- D-1: Neon or Railway, and which account owns it.
- D-3: drop presence, or replace it with Ably.
- The maintenance window for the production cutover.

## Hypotheses and Unknowns
- Better Auth's custom `verify` handles the bcrypt migration without a forced reset (probe in T-004).
- Drizzle transactions through Neon's pooler cover the atomic paths that used PL/pgSQL (probe in T-004).
- The `SupabaseLikeClient` cast sites are simple enough to rewrite mechanically. The probe samples `lib/strap-membership.ts` and `lib/welcome.ts` to calibrate effort for T-008.

## Touchpoints to Exercise
Sign-up, sign-in, reset, sign-out, onboarding, `/file` editing and history, proposals, `/connections` OAuth and device flows, `/mcp` read and write with each credential type, `/vault` create, reveal, rotate, delete, Company invites and permissions, GitHub push and pull, `/skills` publish and sync, `/api/health`, the retention job, and account deletion.

## Probe Findings
Local database, bcrypt upgrade, provider-subject matching, session lifecycle and repository samples pass. See `research/local-foundation-evidence.md`. The Google signing boundary uses a test key; a real provider callback with an imported user remains pending. The probe (T-004 plus a one-user rehearsal import) must finish before WS-C starts at scale.

## Footguns Discovered
- Session clients depend on RLS for personal reads and writes. Removing RLS without matching guards silently widens access.
- `app/page.tsx` sniffs `sb-*` cookies for a fast path. The replacement must check the Better Auth cookie name.
- `app/auth/callback/route.ts` also handled GitHub identity linking. Repository access uses the separate GitHub OAuth app and must not regress.
- Five tests assert on migration SQL text and will fail as soon as `supabase/migrations` moves.
- `isSupabaseTableMissingError` gates first-run behaviour. The replacement must map Postgres error `42P01`.
- Better Auth's default user table name is `user`, a reserved word in SQL. Use `modelName` mappings to `users`, `sessions`, `accounts`, `verifications`.

## Remaining Unknowns
- pg_cron availability on the chosen host. The plan does not depend on it.
- Whether Netlify cold starts plus Better Auth session lookups change `/file` latency noticeably.

## Dependencies
A Neon or Railway account, Google and X OAuth app access, Resend, Netlify environment access, GitHub Actions secrets, and the current Supabase service key for the export.

## Approval Notes
Bart authorized implementation on a feature branch with local Postgres first on 2026-09-13, then selected the existing Google OAuth app for rehearsal. Hosted provisioning, commits, pull requests, production cutover and project deletion have not been requested in this implementation turn.

On 2026-09-16 Bart authorized continuing implementation, committing and pushing the feature branch, and the babysit workflow through Codex review and merge. Hosted provisioning and cutover still require the outstanding host and release decisions. Netlify currently deploys main automatically, so the merge must preserve the existing production deployment until cutover is ready.
