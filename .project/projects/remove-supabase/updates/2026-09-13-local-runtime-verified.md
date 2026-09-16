# Local migration implemented and verified

Branch: `feature/remove-supabase`. The application now runs on local Postgres 17.6 through Drizzle, with Better Auth sessions. This supersedes the earlier foundation-only update. Google setup was deferred by the owner; it was not a reason to stop the remaining migration.

## Implemented

- One squashed baseline with 44 tables: 37 preserved application tables, five auth tables and two avatar tables. Eight invoker functions retain atomic Company, device, MCP-counter and skill operations. The baseline adds the already-used `creed_quality_reports.section_hashes` field that was missing from the old catalog.
- All application PostgREST calls and SDK clients are replaced with typed Drizzle queries. Existing large domain modules remain in place for comparison; focused repositories live under `lib/db/repositories/`. The query helper is an error/result wrapper, not a replacement PostgREST builder.
- Viewer queries enforce explicit row scopes and NEW-row checks. Conflict updates also scope the existing row. Company state rechecks live membership and filters hidden/deleted sections before returning data. Named internal service contexts retain domain role and credential checks; they are not available in browser code.
- Better Auth provides email/password, verification, reset, sessions and conditional Google/X providers. Legacy bcrypt hashes upgrade after successful sign-in. Resend uses the existing email templates through a Next `after` task. Custom display names survive provider updates. Sign-out revokes the server session; account deletion preserves the legacy subscription safeguard and cascades account data.
- Vault uses a separate AES-256-GCM key, item/profile authenticated data, metadata-only lists and fail-closed audited reveal. Personal and Company avatars are database bytes served with ETags and immutable version URLs.
- Company presence is removed; adaptive polling and same-browser coordination remain. Daily maintenance deletes old activity and expired OAuth authorizations behind its dedicated secret.
- The import reads a consistent source snapshot without source writes or an export file. It preserves IDs, bcrypt hashes and agent credentials, transforms provider accounts and re-encrypts Vault values. It refuses nonempty or nonlocal destinations, unknown source tables/columns and nonempty source storage. Generated columns are recomputed.
- Supabase SDK packages, clients, migration/configuration directory, provider skill and compatibility skill link are removed. Setup, security, context, marketing, CSP and verification scripts describe the new implementation. The general Postgres best-practice skill remains.

## Verification

| Check | Result |
| --- | --- |
| Full Node suite with local database enabled | 283 passed; zero failures or skips |
| Database subset | 81 passed, including 45 individually named policy-negative cases |
| Production build | Passed |
| TypeScript | Production build typecheck passed; standalone check recorded in the local log |
| ESLint | Zero errors, six pre-existing navigation warnings |
| Dependency audit | Zero vulnerabilities, including development dependencies |
| CLI suites | Primary CLI: 39 passed; legacy CLI: 20 passed; package sources unchanged |
| Brand audit / Delano | Passed; Delano reports zero errors and warnings |
| Local HTTP/API/MCP rehearsal | Passed; repeat with `npm run verify:local` against a running localhost app |
| Legacy subscription deletion rehearsal | Passed on a separate app and disposable database with a local Stripe fixture |
| Company provisioning | Eight independent connections returned the same Company; membership failure rolled back the profile |
| Browser | Email sign-in, `/file`, editor change and reload passed; the changed text survived reload |
| Import rehearsal | All source and destination row counts matched in a disposable local target |

The HTTP rehearsal covers anonymous denial, Personal save/reload, profile naming, both avatar uploads/bytes/ETags, Vault create/list/reveal/delete, scoped headless MCP read and write denial, OAuth device approval, scope clamping, refresh rotation/replay denial, Company onboarding, direct edits, stale revisions, a second session polling the edit, proposal approval, history/restore/reorder, hidden sections, Vault denial for members, membership revocation, maintenance denial, health and sign-out. Fixtures use random accounts and clean up only their own records. No live email or Google/X request is sent by the tests.

The local source mirror contained 3 users, 4 profiles, 5 memberships, 2 legacy token rows, 4 scoped keys, 7 skills and 25 skill versions. Those counts describe the local fixture mirror, not production. The rehearsal found and fixed an attempt to insert stored generated columns. Synthetic import coverage additionally verifies Vault re-encryption, bcrypt and Google subject preservation, unknown-column failure and atomic rollback.

A warm Personal state repository load issues 10 SQL queries and took 12 ms in the local measurement. The prior source path performed the same ten logical reads, including its separate user enrichment call. This is the shared profile-loading work for `/file` and `/api/app/state`; session, active-profile and checklist overhead is separate. Hosted latency and pooler behavior remain part of the hosted rehearsal, with no claimed production performance result.

Raw local logs are under `.agents/logs/remove-supabase/` (ignored). The browser screenshot is `output/playwright/local-postgres-file.png` (ignored). Durable authorization evidence is in `research/authorization/matrix.md` and `policies.json`; tests are committed-source candidates in `tests/db/`. The working tree remains uncommitted.

The environment example now defaults to localhost for the authorized local-first setup. The positive brand assertion for the deployed Strap origin checks README, while a separate assertion protects the example's local origin. Existing protocol and agent-contract test files and both CLI source packages are unchanged.

## Deferred release work

- T-021: independent authorization review (split from completed implementation T-011). No subagents or second model were used, per the owner's restriction. The matrix and negative checks pass; independent review is still open.
- T-016: hosted pooler/rehearsal, real delivered verification/reset mail, and real Google/X sign-in with imported accounts and existing production OAuth credentials. The existing Google app is selected, but credentials and redirect URIs were not changed. Keep its existing Supabase callback.
- T-017: choose the host and maintenance window, execute production import/deployment, configure the hosted maintenance workflow, and verify rollback and production data.
- T-018: decommission only after the 30-day rollback period. Production resources and existing source secrets have not been removed.
- Generated OpenWiki and local generated Netlify artifacts refresh from source through their normal build/workflow. They are not hand-edited or treated as current runtime source. Historical project records, import compatibility logic, the preserved agent-contract example and the retained Postgres skill may still name Supabase.

Local implementation is verified. This record does not declare production cutover or independent review complete.
