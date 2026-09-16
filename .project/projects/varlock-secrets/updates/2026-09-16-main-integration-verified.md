---
timestamp: 2026-09-16T05:37:38Z
status: done
task:
stream:
---

# Main integration verified

## Completed
- Merged `origin/main` at `e2df9f508d0a7824139a4fcc53e6ed98919685f1` (Postgres and Better Auth, PR 16) into `feat/varlock-strap-secrets`. A final fetch found the same main head. All nine merge conflicts are resolved.
- Ported key persistence to Drizzle and per-item/profile checks into the encrypted Vault repository. Live membership checks and required audit-before-decryption behavior remain intact.
- Replaced the Supabase migration and pgTAP tests with `db/migrations/0001_headless_vault_item_grants.sql`, its generated schema snapshot, and real Postgres integration tests. Existing and imported keys retain empty grants; migration reruns preserve data. Retained main's Supabase skill removal.
- The built-app runtime rehearsal now tests ordinary keys being denied, explicitly granted reveals without session cookies, audit attribution, and revoked keys. CI runs this rehearsal alongside the existing auth, Company, MCP, and OAuth checks.
- Updated setup and delivery documentation for the new backend. This record supersedes the Supabase deployment instructions in the earlier local verification note.

## Verification
- Forward migrations applied to an isolated local Postgres 17 container. Existing local databases and hosted services were untouched.
- Full database-enabled Node suite: 298 passed, zero failures or skips. Includes forward upgrade, source import, live role changes, cross-profile denial, revoked/expired keys, required audit failure, grant constraints, route payloads, and service-only access.
- Root TypeScript and production build passed. ESLint: zero errors and six existing navigation warnings.
- Varlock package: typecheck, six tests, actual CLI loading, and four-file tarball dry run passed. Primary CLI: typecheck and 39 tests. Legacy CLI: typecheck and 20 tests.
- Built-app HTTP rehearsal passed with Better Auth sessions, Personal/Company persistence, avatars, audited Vault access, scoped MCP, device authorization, concurrent refresh rotation, and session revocation.
- Actual Varlock CLI resolved through the built app into its child environment from encrypted Postgres. Bootstrap credentials were excluded; output exposed neither credential nor value; revoking the key rejected the next load.
- Brand audit and Delano validation passed. Local test logs are outside the tracked tree.

## In Progress
- None.

## Blockers
- None for local integration with the checked main commit.

## Next Actions
- Push and PR checks remain separate. No branch push, main merge, deployment, or package publication was performed.
- Run `npm run db:migrate` before deploying this feature, then publish/install the provider. The main backend's hosted cutover requirements remain governed by its own contract.
