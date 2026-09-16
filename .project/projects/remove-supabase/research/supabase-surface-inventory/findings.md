---
type: research_findings
project: remove-supabase
slug: supabase-surface-inventory
created: 2026-09-13T17:49:10Z
updated: 2026-09-13T17:49:10Z
---

# Findings: Supabase surface inventory

## Source References

- `package.json`: `@supabase/ssr` ^0.10.0 and `@supabase/supabase-js` ^2.101.1 are the only Supabase packages. `packages/strap` and `packages/creed-cli` have none.
- `lib/supabase/{admin,browser,server,env,types}.ts`: the three client factories, the env accessors, and the `SupabaseLikeClient` structural type.
- `supabase/migrations/*.sql` (71 files, 4,096 lines), `supabase/tests/*.sql` (2 pgTAP files, 34 assertions), `supabase/email-templates/*.html` (2 auth templates).
- ripgrep counts over `app/`, `lib/`, `components/`, `scripts/`, `tests/`, `.github/`, `next.config.ts`, and `proxy.ts` on 2026-09-13.
- Row counts from the hosted project through the service key on 2026-09-13. Only counts were read.
- Better Auth documentation through Context7 (`/better-auth/better-auth`): custom password hashing, UUID ids, Next.js handlers, verification and reset hooks, social providers, account linking.

## Observations

### What Supabase provides today

| Capability | Where it is used | Size | Replacement |
| --- | --- | --- | --- |
| Postgres schema | `supabase/migrations/` | 39 tables, 25 functions, 76 RLS policies, 71 forward-only migrations | Plain Postgres on Neon. Drizzle schema plus drizzle-kit migrations from a squashed baseline |
| PostgREST query builder | `lib/` 162 `.from()` and 10 `.rpc()`, `app/` 44 `.from()`, `scripts/` 9 and 1 | 215 call sites. `SupabaseLikeClient` cast in 30 files, 109 references | Drizzle repositories under `lib/db/` |
| Auth (GoTrue) | 34 files | `getUser` 21, `admin.getUserById` 8, `signOut` 6, `updateUser` 3, `onAuthStateChange` 3, `getSession` 2, one each of `signUp`, `signInWithPassword`, `signInWithOAuth`, `resetPasswordForEmail`, `exchangeCodeForSession`, `admin.listUsers`, `admin.deleteUser` | Better Auth with the Drizzle adapter |
| Sign-in methods | `components/auth/*`, `app/auth/callback/route.ts` | Email and password, Google, X (OAuth 2.0). Email confirmation and password reset links | Better Auth email/password plus `google` and `twitter` providers. Resend sends verification and reset mail |
| Session cookies | `lib/supabase/server.ts`, `browser.ts`, `proxy.ts`, `app/api/auth/signout/route.ts`, `app/page.tsx` | Middleware refresh on every non-marketing request. `sb-*` cookie sweep on sign-out. Cookie sniff on `/` | Better Auth session cookies with cookie cache. Middleware keeps only request id and pathname |
| User metadata and identities | `lib/user-name.ts`, `lib/strap-backend.ts` 286-330, `lib/github-version-control.ts`, `app/auth/callback/route.ts` | `user_metadata.display_name`, `full_name`, `name`, `avatar_url`. `identities[].identity_data` for Google and GitHub | Columns on `users` (`display_name`, `avatar_url`, `image`). Provider data on `accounts` |
| RLS | 75 `auth.uid()` uses. `creed_role`, `creed_section_permission`, `creed_type` definer helpers | The session client relies on RLS for personal reads and writes. The admin client bypasses RLS after app checks | Explicit TypeScript guards on every repository call. Policies dropped |
| SQL functions that stay | `provision_company_creed` (5 references), `transfer_creed_ownership` (1), `consume_oauth_device_authorization`, `record_oauth_device_verification`, `increment_mcp_read_for_creed` (1), `strap_skills_read` (2), `strap_skill_publish` (1), `strap_skill_document` (called by the other skill functions) | Plain PL/pgSQL with explicit user parameters. No `auth.uid()` | Keep in the baseline without role grants, or port to Drizzle transactions |
| SQL functions that go | `debit_credits`, `credit_topup`, `grant_allowance`, `credit_spend_total`, `company_debit_credits`, `company_credit_topup`, `company_grant_allowance`, `company_credit_spend_total`, `apply_company_lifetime_seat_purchase`, legacy `increment_mcp_read`, `creed_role`, `creed_section_permission`, `creed_type`, `creed_vault_*` | No application callers, RLS-only, or Vault-bound | Drop |
| Realtime | `components/strap/strap-provider.tsx` 577-725 | One presence channel and one broadcast event per Company profile. No `postgres_changes` subscriptions. Publication rows for 3 tables are unused by clients | Keep the existing adaptive poll. Drop presence and broadcast (D-3) |
| Storage | `app/api/app/profile/avatar/route.ts`, migration `20260706194000` | One public bucket `creed-avatars`, 3 MiB limit. 0 objects in production | Avatar bytes in Postgres served through a cached route (D-4) |
| Vault | migration `20260722120000`, `lib/api-key-vault.ts`, `components/strap/api-key-vault-screen.tsx` | `supabase_vault` extension. 4 service-only definer RPCs. 1 production item | AES-256-GCM ciphertext column under a dedicated `STRAP_VAULT_SECRET`, reusing `lib/secret-crypto.ts` |
| pg_cron | migration `20260710120000` | One daily job deleting `creed_activity` older than 90 days | Authenticated maintenance route triggered by a GitHub Actions cron |
| Auth email templates | `supabase/email-templates/` | Confirm signup and reset password, styled in the redesign | Move to `lib/email-templates/`. Send through Better Auth hooks and `lib/email.ts` |
| Supabase CLI and tests | `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `supabase/tests/` | `npx supabase link`, `db push`, `db reset`. 34 pgTAP assertions | `drizzle-kit migrate`. node:test integration tests against a Postgres service |
| Health | `app/api/health/route.ts` | `creed_files` count probe and `admin.listUsers` | `select 1` and a users-table probe |
| Environment | `.env.example`, `.env.local`, Netlify | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `ANON_KEY`, `SUPABASE_SECRET_KEY` or `SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` and secret, `X_CLIENT_ID` and secret, `STRAP_VAULT_SECRET`, `STRAP_MAINTENANCE_SECRET` |
| Security headers and images | `next.config.ts` lines 14, 18, 101. `.netlify/netlify.toml` remote images | `*.supabase.co` in script-src, connect-src, and remote image patterns | Remove |
| Copy and docs | `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `BOOTSTRAP.md`, `components/marketing/stack-page-view.tsx`, `components/strap/api-key-vault-screen.tsx`, `components/auth/backend-setup-screen.tsx`, `openwiki/` (5 pages), `.project/context/` (7 files), `.agents/skills/supabase*`, `skills-lock.json`, `scripts/strap-rebrand-allowlist.json` | Prose and product copy name Supabase and Supabase Vault | Update or remove. OpenWiki regenerates from sources |
| Tests reading Supabase artifacts | `tests/company-p0-migrations.test.ts`, `tests/headless-access-vault.test.ts`, `tests/merge-readiness.test.ts`, `tests/strap-profile-defaults-migration.test.ts`, `tests/strap-theme-assets.test.ts` | Assert on migration SQL text and email template paths | Rewrite against the new schema and template locations |
| Verification scripts | `scripts/verify-legacy-deletion.mjs`, `scripts/verify-company-provisioning.mjs`, `.agents/logs/strap-verification/*.mjs` | Create users through the Supabase admin API | Rewrite against Better Auth and the database |

### What is not affected

- `packages/strap` and `packages/creed-cli` contain no Supabase code. MCP, OAuth 2.1 discovery, `strap_key_` and `creed_key_` credentials, and the `https://creed.md` compatibility origin are app-owned tables and routes. Only their persistence calls change.
- OpenRouter, GitHub synchronization, Resend, and the Strap markdown format are untouched.
- OAuth tokens for connected agents are stored as SHA-256 hashes plus AES-256-GCM ciphertext under `STRAP_ENCRYPTION_SECRET`. They survive a data copy unchanged.

### Production data on 2026-09-13

| Table | Rows |
| --- | --- |
| `auth.users` | 2 |
| `creeds` | 3 |
| `creed_members` | 3 |
| `creed_sections` | 19 |
| `creed_section_versions` | 11 |
| `creed_activity` | 19 |
| `creed_audit_log` | 34 |
| `oauth_clients` | 5 |
| `oauth_tokens` | 3 |
| `creed_mcp_clients` | 4 |
| `creed_vault_items` | 1 |
| `creed_integrations` | 1 |
| `creed_version_control` | 2 |
| `creed_tokens`, `creed_connections`, `creed_getting_started` | 2 each |
| `creed_entitlements`, `creed_credits`, `creed_credit_transactions`, `creed_ai_settings`, `creed_company_ai_settings` | 1 each |
| Every other table, and `creed-avatars` objects | 0 |

The volume allows one scripted export and import inside a short maintenance window. No dual-write period is needed.

### Auth migration details

- Supabase stores passwords as bcrypt. Better Auth accepts custom `password.hash` and `password.verify`. The verify function detects a bcrypt prefix, checks it with `bcryptjs`, and rehashes with the Better Auth default on success. With 2 users a forced reset is an acceptable fallback.
- Better Auth `advanced.database.generateId: "uuid"` keeps ids as UUIDs, so exported `auth.users.id` values are inserted as-is and every `user_id` foreign key stays valid.
- Google identities carry the provider subject in `auth.identities.provider_id`. The import writes them to Better Auth `accounts` rows so social sign-in matches the existing user.
- Google and X client ids and secrets live in the Supabase Auth provider settings today. They must be re-registered with the callback URLs `/api/auth/callback/google` and `/api/auth/callback/twitter`.

## Options Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Host: Neon | Serverless-friendly pooling, branching for rehearsal, Netlify DB integration, free tier | Another vendor. pg_cron availability depends on plan | Recommended (D-1) |
| Host: Railway | Bart already operates Railway. Simple container | No built-in pooler for Netlify functions. Manual backups | Alternative |
| Host: self-hosted | Full control | Operations burden for a two-user product | Rejected |
| Data access: Drizzle with the `postgres` driver | Typed schema, migrations, transactions, portable across hosts | 215 call sites to rewrite | Recommended |
| Data access: PostgREST-shaped shim over SQL | Fewest edits | Keeps a fake Supabase API alive and hides authorization gaps | Rejected |
| Auth: Better Auth | Self-hosted, Drizzle adapter, UUID ids, custom hashing, Google and X, verification and reset hooks | New dependency. Session table in Postgres | Recommended (D-2) |
| Auth: Auth.js | Widely used | Weak email/password story. No password migration hooks | Rejected |
| Auth: Clerk or WorkOS | Hosted, fast | Swaps one vendor lock-in for another. Per-user pricing | Rejected |
| Realtime: keep polling, drop presence | No new service. The poll already exists | Loses "who is editing" hints in Company mode | Recommended (D-3) |
| Realtime: Ably or Pusher | Presence and broadcast as a service | New vendor and key for a feature with three profiles in production | Deferred |
| Avatars: Postgres bytea plus cached route | No new vendor. 0 objects to migrate | The database serves images. Fine at 3 MiB and low volume | Recommended (D-4) |
| Avatars: Cloudflare R2 | Proper object storage. Domain already on Cloudflare | Extra credentials and bucket policy | Alternative if volume grows |
| Vault: AES-256-GCM in the app | Reuses `lib/secret-crypto.ts`. One dedicated key | Key rotation is a manual re-encrypt job | Recommended (D-5) |
| Retention: GitHub Actions cron calling a secured route | The repo already runs Actions. Portable | Depends on Actions availability. One more secret | Recommended (D-6) |
| Migrations: squash into one baseline | Clean schema. No Supabase roles or extensions to emulate | History lives only in git | Recommended (D-7) |
| Migrations: replay 71 files with edits | Keeps file history | Every file references `auth.users`, roles, or extensions | Rejected |

## Fold-Forward Candidates

| Finding | Target Artifact | Proposed Change |
| --- | --- | --- |
| Surface inventory and sizes | `spec.md` | Scope, requirements, touchpoints. Done |
| Replacement choices | `decisions.md`, `plan.md` | Decisions D-1 to D-9 and architecture. Done |
| Volume and cutover shape | `plan.md`, WS-E tasks | One scripted cutover with a rollback window. Done |
| RLS to application guards | T-011 | Policy matrix and negative tests. Planned |

## Open Questions

- Neon or Railway for hosting (D-1). Neon is assumed until Bart decides.
- Drop Company presence, or fund Ably (D-3).
- Which Google and X OAuth apps to reuse. Both need new callback URLs.
- The maintenance window for the production cutover.
