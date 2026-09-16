# Local foundation evidence

Historical foundation milestone. The later runtime result and current gates are recorded in [the local runtime update](../updates/2026-09-13-local-runtime-verified.md).

Implementation started on `feature/remove-supabase` on 2026-09-13 under the owner's instruction to use local Postgres first. Hosted provisioning, production changes and decommissioning remain deferred. The owner subsequently selected the existing Google OAuth app for the provider rehearsal.

## Schema reconciliation

The local `supabase_db_strap-release-20260913` database has exactly the same 61 migration versions as this checkout, ending at `20260913153559`. A schema-only dump contained 37 current public tables, 45 current public policies and 21 public functions. The original inventory's 71 migrations, 39 tables and 76 policies do not represent the current applied schema. Preserve the original research as provenance; use the applied catalog for the rewrite matrix.

The plain baseline preserves all 37 application tables and adds five auth tables: users, sessions, accounts, verifications and persistent rate limits. User foreign keys reference `public.users`. Vault's identifier and its unique constraint are replaced by `secret_ciphertext`. RLS and provider-specific functions are omitted. Eight called functions remain, with invoker permissions.

A catalog comparison against the transformed source found identical definitions for all 388 application columns, 142 constraints and 99 indexes, including primary-key index order, generated columns, identity generation, defaults and foreign-key delete actions. Auth columns are excluded from that comparison because they are new. Both initial application and a repeat migration passed on local Postgres 17.6.

Drizzle introspection needed corrections before use: composite index operator classes were assigned to the wrong columns, four composite primary-key orders changed, an empty text array became an array containing an empty string, and the empty Vault description default produced invalid TypeScript. The catalog comparison caught these differences. The committed schema preserves the original definitions.

The retained `increment_mcp_read_for_creed` function referenced `creed_members.status`, which does not exist in the applied schema. The new function checks current membership by row existence, matching the current membership lifecycle. Its integration test checks successful increments and outsider denial. Historical migrations were not changed.

## Authentication probe

The local probe verifies:

- Sign-up generates UUIDs and requires email verification.
- A failed Drizzle transaction leaves no inserted user.
- An imported-format bcrypt credential rejects a wrong password without changing the hash.
- A correct password preserves the user UUID and upgrades the credential to Better Auth's current hash.
- Google subject matching resolves the existing imported-format account and does not create a duplicate user.
- Password reset tokens work once and revoke existing sessions.
- Sign-out removes the session; a subsequent uncached session lookup fails.

The Google test substitutes the provider's signing-key lookup with a local RSA key. The JWT still goes through Better Auth's signature, issuer, audience and account-resolution code. It is not evidence of a real Google callback or a production-user import. Those checks remain pending, along with hosted pooler verification.

The repository probe implements viewer-scoped membership and welcome repositories alongside the existing runtime. It tests outsider reads and writes, immediate membership removal, and Personal-first profile ordering. Membership listing uses one joined query instead of the old two-query path. Full `/file` and MCP query-count measurements belong to T-008.

## Replacement for the 34 pgTAP assertions

| Original assertions | New coverage or reason |
| --- | --- |
| `shared_skills`: 1-6, anonymous direct SQL and RPC access | No anonymous database role or Data API exists in the target. These direct-SQL role checks are removed. HTTP/session authorization checks remain part of T-011. |
| `shared_skills`: 7-12, authenticated direct SQL and RPC access | No browser database role or Data API exists in the target. These checks are removed for the same reason; explicit viewer guards are required before runtime cutover. |
| `shared_skills`: 13-14, publish and member read | `tests/db/skills.test.ts`: owner publishes and member reads. |
| `shared_skills`: 15-16, outsider read and member publish denial | Outsider reads and member publication are denied. |
| `shared_skills`: 17-19, next revision, stale conflict, history | Publication keeps history and rejects stale changes. |
| `shared_skills`: 20-24, archive, retry, admin restore, removed-member denials | Archive retry is idempotent, admin can restore, removed members lose access. |
| `shared_skills_quota`: 1-10 | All ten assertions are ported in the quota test: bounded usage, pruning, current revisions, summaries, accounting, overflow rollback and archival at capacity. |

The full active-policy matrix and its second-model review are still T-011 work. No subagents were used.

## Dependency justification

- `postgres` provides a portable direct Postgres driver.
- `drizzle-orm` provides typed queries, transactions and migration execution.
- `drizzle-kit` generates the schema baseline and future migrations.
- `better-auth` provides application-owned identity and sessions.
- `bcryptjs` verifies imported legacy password hashes until they upgrade.
- An override raises Drizzle Kit's transitive `@esbuild-kit/core-utils` esbuild dependency to the patched 0.25 series. `npm audit` reports zero vulnerabilities. Existing package versions were preserved except Zod, which Better Auth requires at a newer version.

## Remaining gate

The existing Google app was selected, but its credentials are absent from `.env.local`. Bitwarden access failed and this session has no browser-control tool. The owner subsequently requested skipping credential setup and the live rehearsal for now. No Google credentials or redirect URIs were changed; the existing Supabase callback remains untouched. T-004's live-provider evidence is deferred, not passed. Local synthetic test results do not establish real-provider readiness.
