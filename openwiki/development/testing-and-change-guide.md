---
type: "Reference"
title: "Testing and change guide"
description: "Verification commands, the focused test map, per-area change guidance, and high-risk paths plus known coverage gaps for the current Postgres+Drizzle+Better Auth stack."
tags: ["testing", "postgres", "drizzle", "better-auth", "verification", "change-guide", "authorization", "vault"]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-16T08:01:49.714Z
sources:
  - id: openwiki-source-0ec504d4b2bc48a669486a67
    resource: repo://drizzle.config.ts
  - id: openwiki-source-aaeda56d3db31cf8a9690187
    resource: repo://lib/authz/policies.ts
  - id: openwiki-source-66d06723c07def1018d32b78
    resource: repo://lib/vault-crypto.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-c647e078f2eecc3842ab93ae
    resource: repo://scripts/db-migrate.mts
  - id: openwiki-source-39fbbe1a008f72e6fb860751
    resource: repo://scripts/verify-local-runtime.mjs
  - id: openwiki-source-191b2f04697fcc1f6f3d342d
    resource: repo://tests/database-connection.test.ts
  - id: openwiki-source-71c44c74c8be9d038cc9f0ad
    resource: repo://tests/db/harness.ts
  - id: openwiki-source-6c2eed97171c61ee57ff6e0f
    resource: repo://tests/migration-target.test.ts
  - id: openwiki-source-a9d0d335f5c11f9fbe049b80
    resource: repo://tests/strap-compatibility-origin.test.ts
  - id: openwiki-source-7e10a8b2134a80c30c1776f2
    resource: repo://tests/strap-module-compatibility.test.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-16T08:01:49.714Z" }
---

# Testing and change guide

Strap runs on Postgres 17+ (17 locally, 18 on Railway), Drizzle, and Better Auth. The application connects directly from the server; browsers reach data through authenticated app routes. There is no database REST endpoint and no Postgres row-level-security (RLS) dependency — authorization lives in `lib/authz/`, enforced before data is returned. That changes what tests can and cannot cover: root tests mostly exercise pure functions, contracts, migration text, and source invariants, not live Postgres/OAuth/GitHub/OpenRouter integration.

## Standard verification

The authoritative command surface lives in `package.json` scripts. The default root suite runs the Node test runner against `tests/*.test.ts` and `tests/db/*.test.ts`:

```bash
npm test            # node --test on tests/*.test.ts tests/db/*.test.ts (skips DB suites without DATABASE_URL)
npx tsc --noEmit -p .
npm run lint
npm run build
npm run audit:brand # scripts/check-strap-rebrand.mts
```

`npm test` invokes `node --test --experimental-strip-types tests/*.test.ts tests/db/*.test.ts`. Without `DATABASE_URL`, the database integration suites short-circuit (`tests/db/harness.ts` exports `databaseTestsEnabled = Boolean(process.env.DATABASE_URL)`), so the root run is safe in CI without a database.

### CLI packages

The root `tsconfig.json` excludes the CLI packages so Netlify/root builds do not compile their Node-specific code. Root typecheck therefore does not validate `packages/strap`; run package checks explicitly:

```bash
npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm pack ./packages/strap --dry-run
```

For legacy CLI compatibility changes also run:

```bash
npm --prefix packages/creed-cli run typecheck
npm --prefix packages/creed-cli test
```

## Database testing

Local database workflows use Docker, a Drizzle migration runner, and ephemeral per-suite test databases. They never reference `npx supabase db reset` or `supabase/migrations/` — those commands belong to a removed Supabase stack.

```bash
npm run db:up        # docker compose up -d --wait (Postgres 17, loopback-bound, own volume)
npm run db:ping      # scripts/db-ping.mts — verifies DATABASE_URL connects and runs `select 1`
npm run db:migrate   # scripts/db-migrate.mts — drizzle-orm/postgres-js migrator against db/migrations
npm run test:db      # node --import ./scripts/db-env.mts --test --experimental-strip-types tests/db/*.test.ts
npm run verify:local # scripts/verify-local-runtime.mjs — exercises a running localhost app with a fresh synthetic account
```

`scripts/db-env.mts` loads this checkout's `.env.local` when not in CI; CI supplies variables explicitly. `DATABASE_URL` is required for any database work. `db:ping` and `db:migrate` both call `createConnection(databaseUrl(), { sslCa: process.env.DATABASE_SSL_CA })`.

### Schema changes

For schema changes run the Drizzle generate → review → migrate → test loop, not a full reset:

```bash
npm run db:generate -- --name=<change>   # drizzle-kit generate against db/schema/*.ts, output to db/migrations
# review the generated SQL
npm run db:migrate
npm run test:db
```

`drizzle.config.ts` points `drizzle-kit` at `./db/schema/*.ts` with migrations written to `./db/migrations`. `db/migrations/0000_baseline.sql` is the single squashed baseline; its final block contains retained atomic functions from `db/functions/baseline.sql`. Drizzle does **not** generate function migrations — function edits require a hand-written SQL migration plus an update to the reference file in `db/functions/`. `db/README.md` documents 44 schema tables; run migrations once per release.

### Ephemeral test databases

`tests/db/harness.ts` is the contract for database integration suites. `createTestDatabase()`:

- requires `DATABASE_URL` and rejects any non-local host (`localhost`, `127.0.0.1`, `[::1]`, `postgres` only);
- creates a random `strap_test_<id>` database via `CREATE DATABASE`, runs Drizzle migrations against it, and returns `{ db, connection, close }`;
- `close()` drops **only** that test database (`DROP DATABASE ... WITH (FORCE)`) and closes both connections.

Existing application data is never truncated. The local role needs the `CREATEDB` privilege. Each suite owns its ephemeral database, so suites can run concurrently without colliding.

### Local HTTP rehearsal

`npm run verify:local` (`scripts/verify-local-runtime.mjs`) is a single end-to-end script that boots no database of its own — it requires a running localhost app **and** a local `DATABASE_URL`, and refuses non-local hostnames for both. It creates a synthetic user with `on conflict do nothing` inserts, drives the real app over HTTP (sign-in, state load/save, avatar upload + cache validation, Vault create/list/reveal/delete, scoped read key, MCP `read_strap` through that key, read-only tool filtering, OAuth client registration → device authorize → verify → decision → token exchange → refresh rotation including a concurrency race with exactly one winner), then Company provisioning, member onboarding, proposal/direct-edit behavior, version restore, reorder, hidden sections, and finally `delete from users` in `finally` to clean up its own account. It is the closest thing to a live integration gate but still runs against a local app, not production.

## Focused test map

Test names below are verified against `tests/`. Pick the suite that matches the surface you touched rather than running everything.

| Area | Representative tests |
|---|---|
| Strap naming/protocol | `strap-brand`, `strap-protocol-compatibility`, `strap-agent-contract`, `strap-compatibility-origin`, `strap-module-compatibility` |
| Profile defaults/GitHub | `profile-file`, `github-roundtrip` |
| OAuth/keys/Vault | `headless-access-vault`, `mcp-connection-status`, `mcp-health-filter`, `connection-actions` |
| Company policy | `company-permissions`, `company-onboarding`, `company-proposal-drafts` |
| Editor/rich text | `editing-system`, `rich-text-equivalence`, `section-suggestions`, `editor-dependencies` |
| AI/agent | `panel-actions`, `panel-agent`, `panel-mentions`, `tab-completion`, `quality-scope`, `openrouter-routing` |
| Skills | `skill-bundles` |
| Auth/email | `auth-email` |
| DB/migration | `database-connection`, `migration-target`, `tests/db/**` |
| Primary CLI | `packages/strap/tests/**` |
| Legacy CLI | `packages/creed-cli/tests/**` |

Most root tests exercise pure functions, contracts, migration text, or source invariants. `strap-compatibility-origin` and `strap-module-compatibility` read source files and the rebrand decisions doc to assert compatibility origins and shim re-exports stay intact; `migration-target` checks hosted import destination matching; `database-connection` asserts hosted connections enforce verified TLS (`rejectUnauthorized: true`, `prepare: false`, `max: 1`) even when the URL tries `sslmode=disable`. These do not replace browser, live Postgres, OAuth, GitHub, or OpenRouter integration testing.

## Change map

### Product naming and compatibility

Start with `lib/marketing/brand.ts`, `lib/profile-file.ts`, `app/mcp/route.ts`, `/api/strap/**`, and `scripts/check-strap-rebrand.mts` (the `audit:brand` script, backed by `scripts/strap-rebrand-allowlist.json`). New customer-facing vocabulary and implementation paths are Strap, but preserve exact compatibility/history identifiers: Creed database objects, migrations, deprecated `lib/creed-*` compatibility re-export shims, `/api/creed/**` compatibility APIs, `creed_*`, `creed://`, existing `creed_key_`, and `packages/creed-cli`. Do not remove compatibility paths as a drive-by cleanup. Repository and GitHub references must use `https://github.com/MajesteitBart/Strap`; retain the old remote name only in explicit historical evidence.

### OAuth, MCP, connections, and CLI

Verify PKCE, redirect validation, one-time code/device consumption, polling backoff, token rotation/revocation, explicit Personal/Company grants, all three mode ceilings, hidden-section filtering, fail-narrow modern grants, and legacy-only Personal fallback. Check canonical Strap discovery and every exact compatibility alias through the same dispatcher. Test `packages/strap` separately and exercise real MCP clients for protocol changes. `npm run verify:local` covers the device-flow + refresh-rotation race as a rehearsal; it does not replace live provider rehearsal.

### Vault

Start with `lib/vault-crypto.ts`, `lib/api-key-vault.ts`, `lib/db/repositories/vault.ts`, `app/api/app/vault/**`, and `components/strap/api-key-vault-screen.tsx`. Verify metadata-only list, Personal and Company owner/admin/member behavior, item-loaded authorization, AES-256-GCM AAD binding, create/reveal/rotate/delete, no-store responses, 30-second UI clearing, and fail-closed reveal audit.

`lib/vault-crypto.ts` is the cryptographic core: `encryptVaultSecret`/`decryptVaultSecret` derive a 256-bit key via SHA-256 of `STRAP_VAULT_SECRET` (≥32 chars), use AES-256-GCM with a 12-byte random IV, and bind the ciphertext to `strap:vault:v1:<profileId>:<itemId>` as AAD. The envelope format is `v1.<iv>.<authTag>.<body>` with no extra fields; `decryptVaultSecret` rejects malformed envelopes. Because the AAD binds item and profile, ciphertext is not portable across items or profiles — copying agent/provider ciphertext requires `STRAP_ENCRYPTION_SECRET` to keep its existing value. Vault protects storage; explicit operations carry plaintext through bounded server/browser memory only.

### Profile files and GitHub

Start with `lib/profile-file.ts`, `lib/strap-markdown.ts`, `lib/github.ts`, `lib/github-version-control.ts`, `lib/company-github.ts`, and profile/GitHub tests. `lib/creed-markdown.ts` is only a deprecated compatibility re-export shim. Verify new `strap.md` defaults, fallback read to `creed.md`, custom paths, no parallel-file push, SHA conflicts, Personal preview/apply, Company push, and formatting round trips.

### Free-plan and AI behavior

Pricing facts live in `lib/marketing/pricing.ts`: all current plans are `$0 forever`. There is no Stripe runtime. Treat Stripe-named migrations and billing records as history unless active source proves otherwise. AI still has included-key/BYOK, usage, quota, routing, and persistence behavior. Included AI uses a process-local 20-request/60-second burst limit and a default `$0.50` estimated-cost ceiling over the trailing 24 hours per user, configurable with `INCLUDED_AI_DAILY_LIMIT_USD`; absent `OPENROUTER_PLATFORM_KEY` requires BYOK. Test provider errors and usage accounting independently from customer billing.

### Sections and Company policy

Read `components/strap/file-screen.tsx`, `components/strap/strap-provider.tsx`, `lib/strap-data.ts`, `lib/strap-permissions.ts`, `lib/validation/strap-state.ts`, `lib/company-sections.ts`, and `lib/authz/policies.ts`. Verify Personal/Company separately, direct/proposal behavior, revision conflicts, hidden sections, version history, and the TypeScript/SQL policy equivalence.

**Authorization changes:** when adding or altering tables or columns, update `lib/authz/policies.ts` `rowScope`/`authorizeValues` (deny-by-default for unknown) and keep the TypeScript rules equivalent to any new SQL constraints. This replaces the old "keep TS and SQL RLS twins aligned" guidance — there is no live RLS to twin against; `rowScope`'s SQL predicates are the application equivalent of the baseline's 45 active RLS policies, and unknown tables/actions return `false`. `authorizeValues` additionally checks the **new** row values on insert/update to prevent moving an owned row to another profile or cross-profile upsert theft.

## High-risk and known gaps

High-risk files include `app/mcp/route.ts`, `lib/strap-data.ts`, `lib/strap-backend.ts`, `lib/company-sections.ts`, `lib/authz/policies.ts`, `lib/vault-crypto.ts`, editor/provider orchestration, and Markdown parsing. Compatibility aliases, security policy, and agent instructions make small-looking changes broad.

Coverage gaps remain around end-to-end OAuth/device flows, live MCP authorization, Postgres concurrency/function execution, GitHub OAuth/pull races, OpenRouter streaming/failure behavior, and browser-level Personal/Company collaboration. Verify current source and ordered migrations over stale comments or historical names.
