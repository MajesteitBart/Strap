---
name: Remove Supabase
status: active
lead: MajesteitBart
created: 2026-09-13T17:49:09Z
updated: 2026-09-13T18:09:46Z
linear_project_id:
risk_level: high
spec_status_at_plan_time: planned
operating_mode: multi-stream
---

# Delivery Plan: Remove Supabase

## What Changed After Probe
The application runs on local Postgres with Better Auth and Drizzle. Local browser/API/MCP, import, policy-negative and account deletion rehearsals pass. The owner deferred Google setup and hosted cutover; independent authorization review remains open. See updates/2026-09-13-local-runtime-verified.md for evidence and remaining release gates.

## Technical Context
Next.js 16 on Netlify with 215 PostgREST call sites, 34 auth-touching files, 61 verified migrations, and 45 active public policies. `research/supabase-surface-inventory/findings.md` holds the full inventory, replacement mapping, and production volumes.

## Architecture Decisions
- Local Postgres first; Neon remains the hosted recommendation, accessed with the `postgres` driver and Drizzle ORM (`drizzle-orm/postgres-js`), so the code stays portable to Railway or self-hosting. One pooled connection string, `max: 1` and `prepare: false` per function instance.
- Schema: one squashed baseline migration generated from the live schema minus Supabase roles, `auth.users` references, RLS, `vault`, `storage`, `pg_cron`, and `supabase_realtime`. Plain PL/pgSQL functions with explicit user parameters stay. RLS helpers, Vault RPCs, and unused billing functions are dropped.
- Auth: Better Auth with the Drizzle adapter, UUID ids, `users`, `sessions`, `accounts`, and `verifications` tables, email/password with a bcrypt fallback verify, Google and X providers, cookie cache, and the `nextCookies` plugin. Every `user_id` foreign key re-points to `users.id`.
- Authorization: a `lib/authz/` layer with one guard per former policy family (owner, member, role, section permission, service-only). Repositories take a viewer argument. Internal server operations retain named service contexts after domain role/credential checks. These contexts are unavailable to browser callers.
- Vault: a `secret_ciphertext` column on `creed_vault_items`, AES-256-GCM under `STRAP_VAULT_SECRET`. Reveal, rotate, and delete stay audited with the same fail-closed order.
- Avatars: `user_avatars` and `creed_avatars` tables with `bytea` bodies, served by `/api/avatars/[kind]/[id]?v=<hash>` with long cache headers.
- Realtime: remove the presence and broadcast channel. The adaptive poll remains the sync path.
- Scheduling: `POST /api/internal/maintenance` guarded by `STRAP_MAINTENANCE_SECRET`, called by a GitHub Actions cron.
- Migration: `scripts/migrate-from-supabase.mts` exports public tables, `auth.users`, `auth.identities`, and the Vault plaintext through a narrowly scoped source Vault view, transforms users and accounts into Better Auth rows, re-encrypts Vault secrets, and imports in one transaction with row-count reconciliation.

## Policy and Contract Checks
- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map
- `spec.md`: written from the inventory research on 2026-09-13.
- `plan.md`: this document.
- `workstreams/`: WS-A to WS-F, one per replacement area.
- `tasks/`: T-001 to T-020 with dependencies, plus T-021 for the independent authorization review before cutover.
- `research/supabase-surface-inventory/`: evidence, sizes, and options.

## Complexity Exceptions
- `lib/strap-backend.ts` (77 KB) and `lib/company-sections.ts` (61 KB) are rewritten in place rather than split, to keep the diff reviewable against current behaviour. Owner: MajesteitBart.

## Probe-Driven Architecture Changes
The baseline preserves generated columns and exact composite constraints. Imported bcrypt upgrades use a compare-and-swap after successful sign-in. Better Auth rate limits persist in Postgres. Google credentials and live callbacks remain deferred; local tests validate signed provider claims and identity linking. The import recomputes generated columns, rejects source drift and refuses any nonempty target.

## Workstream Design
- WS-A Database foundation: T-001 to T-003, sequential, first.
- WS-B Authentication: T-004 first, then T-005 to T-007 in parallel.
- WS-C Data access and authorization: T-008 first, then T-009 and T-010 in parallel, then T-011; independent release review is T-021.
- WS-D Platform services: T-012 to T-015 in parallel after T-008.
- WS-E Migration and cutover: T-016 after WS-B, T-011, and T-012. T-017 after everything else. T-018 after the rollback window.
- WS-F Cleanup and documentation: T-019 and T-020 before the cutover.

Delegation: `gpt-6-astra` for the mechanical repository rewrite and the migration script, `fable-5.1` for the authorization matrix, the auth integration, and reviews. Subagents only with Bart's explicit request, per `AGENTS.md`.

## Milestone Strategy
1. Foundation and probe: T-001 to T-004 plus a one-user rehearsal import. Go or no-go on Better Auth and the host.
2. Rewrite: WS-C and WS-D on an integration branch with CI on a Postgres service. No production changes.
3. Rehearsal: full export, import into a Neon branch, browser and MCP verification.
4. Cutover: maintenance window, final import, environment flip, deploy, verification, Supabase paused.
5. Decommission after 30 days.

## Rollout Strategy
One pull request per workstream, reviewed at exact head and merged into a `remove-supabase` integration branch, then one release pull request to `main`. Netlify environment variables switch at cutover. `.env.example` documents the new variables before the release pull request opens.

## Test Strategy
- Unit: the existing 212 app tests keep passing. Migration text tests are replaced by schema tests.
- Integration: node:test suites against `DATABASE_URL` for repositories, guards, auth flows, Vault, retention, and the import script. Skipped locally when the variable is unset, required in CI.
- Authorization: one negative test per former policy family and per credential mode.
- Browser: sign-up, sign-in, reset, onboarding, editor, proposals, Vault, and Company invites through T3 Preview at desktop and mobile widths.
- Agents: `@bvdm/strap` and one MCP client exercise read, propose, and direct write before and after cutover.

## Rollback Strategy
The Supabase project stays paused, not deleted, for 30 days. Rollback is an environment flip back to the Supabase variables and a redeploy of the pre-cutover build. Writes made after cutover would be lost, so the maintenance window stays short and is announced.

## Remaining Delivery Risks
- Authorization gaps when RLS disappears. Mitigation: the T-011 matrix is reviewed by a second model before merge.
- Provider re-registration errors lock out Google or X users. Mitigation: password reset works independently, and the rehearsal covers each provider.
- Netlify function connection limits. Mitigation: pooled string with `max: 1`, measured during rehearsal.
- Effort: T-008 is the largest task and blocks WS-D. It starts immediately after the probe.
