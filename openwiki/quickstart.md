---
type: Reference
title: "Strap repository quickstart"
description: "Entry point that routes readers through the wiki and gives the fastest safe path to a running local environment on the Postgres + Drizzle + Better Auth stack."
tags: [quickstart, setup, local-development, architecture, authorization, invariants]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-16T08:01:49.714Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-06d494debb183d9940ac68da
    resource: repo://app/api/creed/route.ts
  - id: openwiki-source-ec29f5fa7fd3124199a5ff4d
    resource: repo://app/api/strap/route.ts
  - id: openwiki-source-3e96eb3f64ceeca8c914fb05
    resource: repo://app/mcp/route.ts
  - id: openwiki-source-f63ba5482783f8aa31cd7fbd
    resource: repo://app/page.tsx
  - id: openwiki-source-bfce77cffcb85cd38c57e65a
    resource: repo://components/strap/authed-providers.tsx
  - id: openwiki-source-c8e713343ca58b6416089698
    resource: repo://db/README.md
  - id: openwiki-source-b79fbbd921df689b4bbdc82f
    resource: repo://docker-compose.yml
  - id: openwiki-source-dcd1bef5e95672a9349b75ea
    resource: repo://lib/api-auth.ts
  - id: openwiki-source-aaeda56d3db31cf8a9690187
    resource: repo://lib/authz/policies.ts
  - id: openwiki-source-4e7e2d77f9afed1a6247e75b
    resource: repo://lib/db/connection.ts
  - id: openwiki-source-3652311a9c00c131441ae04d
    resource: repo://lib/db/context.ts
  - id: openwiki-source-a65e5bcb51ff8484d0befafa
    resource: repo://lib/db/service.ts
  - id: openwiki-source-ae9343db46bfc2724935b48d
    resource: repo://lib/env.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-e942cb2f2c6b2538f046eef6
    resource: repo://proxy.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "openwiki/0.5.2", at: "2026-09-16T08:01:49.714Z" }
---

# Strap repository quickstart

Strap maintains one compact, curated context profile that connected AI agents read before meaningful work and improve through permission-aware updates. It is not a journal, chat transcript, or generic notes store: durable context stays current, specific, and worth reading. The same model powers a one-user **Personal Strap** and a governed **Company Strap**.

This repository contains the public marketing site, the authenticated application, browser APIs, the OAuth 2.1 and MCP server, the Postgres + Drizzle + Better Auth backend with application-level authorization in `lib/authz/`, OpenRouter/GitHub integrations, and the primary `@bvdm/strap` CLI. The current product name is **Strap**. Stable internal and protocol identifiers still use Creed where compatibility or migration history requires it; do not rename those source paths or contracts casually.

There is no database REST endpoint and no RLS dependency. Browsers talk only to authenticated app routes; the server connects to Postgres directly and enforces authorization before any data is returned.

## Start here

- [Architecture overview](architecture/overview.md): runtime boundaries, request/state flow, and where code belongs across the Next.js app, the Postgres+Drizzle+Better Auth backend, the agent protocol, and external services.
- [Strap domain model](domain/strap-model.md): sections, the permission lattice, proposals/direct edits/history, Personal versus Company persistence, onboarding, collaboration, GitHub serialization, and the profile-file fallback policy.
- [Agents, OAuth, MCP, and CLI](integrations/agents-and-oauth.md): the agent connection and grant model, OAuth authorization-code + RFC 8628 device flows, one-time-visible API keys, MCP canonical/compatibility contracts, and the primary/legacy CLIs.
- [Platform integrations](integrations/platform-services.md): the Postgres+Drizzle+Better Auth backend, OpenRouter included/BYOK AI, GitHub version control, Resend email, pricing, the removed Stripe runtime, configuration, and deployment.
- [Schema and security](data/schema-and-security.md): database schema evolution, the application-level authorization model that replaced RLS, credential hashing/encryption, the in-application Vault crypto boundary, retained SQL procedures, audit, and migration discipline.
- [Testing and change guide](development/testing-and-change-guide.md): verification commands, the focused test map, per-area change guidance, and high-risk paths plus known coverage gaps for the current stack.

## Main surfaces

| Area | Current implementation |
|---|---|
| Web | Next.js 16 App Router, React 19, strict TypeScript |
| Backend | Postgres 17 locally / 18 on Railway, Drizzle ORM, Better Auth, application-level authorization in `lib/authz/`, encrypted Vault |
| Product | `/file`, `/connections`, `/vault`, `/settings`, `/skills` under `app/(strap-app)/` |
| Agents | `/mcp` with browser/device OAuth 2.1 or scoped `strap_key_` keys; legacy `creed_key_` keys remain accepted |
| AI | OpenRouter using deployment-included AI or encrypted Personal/Company BYOK |
| Version control | GitHub push/pull with `strap.md` default and controlled `creed.md` fallback |
| Terminal | Primary Node 22+ dev package `@bvdm/strap` under `packages/strap` (CLI packages declare Node 20+) |

Browser APIs live under `app/api/app/**` and are gated by `requireApiAuth()` (session-based via Better Auth). `/api/app/headless-access/**` manages one-time-visible MCP keys and `/api/app/vault/**` manages Strap-scoped external secrets. Agent-facing protocol lives in `app/mcp/route.ts`. Canonical direct HTTP routes live under `app/api/strap/**`; `app/api/creed/**` remains only as a compatibility shim that re-exports the same handler behavior.

## Current product rules

- **No paid plans:** Open, Personal, and Company are all `$0 forever`. Company supports unlimited invited members. Stripe is absent from active dependencies, environment setup, and runtime billing; checkout and billing webhooks are retired. A configured `STRIPE_SECRET_KEY` is owner-only legacy offboarding so existing subscribers can schedule cancellation from Settings.
- **Included AI or BYOK:** hosted Personal and Company can use a configured deployment OpenRouter key (`OPENROUTER_PLATFORM_KEY`) or their own encrypted key. The historical storage value `ai_mode = 'credits'` is surfaced as **Included**; it is not prepaid billing. Included usage is quota-controlled rather than unlimited (a default `$0.50` trailing-24-hour at-cost ceiling per user via `INCLUDED_AI_DAILY_LIMIT_USD`). BYOK calls do not count toward this limit.
- **Scoped agent access:** every modern OAuth token or headless key resolves one explicit Personal or Company grant. A credential mode (`read-only`, `proposal-only`, or `direct`) can narrow live membership and section permissions but never elevate them. Hidden sections are omitted server-side.
- **One-time-visible keys:** newly created keys use `strap_key_`; only the hash and display prefix are stored. Existing `creed_key_` keys remain accepted compatibility credentials.
- **Vault boundary:** `/vault` lists metadata only. Secret payloads are encrypted at rest in Postgres with AES-256-GCM bound to the item/profile (`STRAP_VAULT_SECRET`) and cross application/server memory only during explicit create, rotation, or audited reveal flows. Lists, logs, audits, and ordinary MCP responses contain metadata or `secret://` references, never secret values.

## Run locally

Prerequisites: Node.js 22+ and Docker. The compiled CLI packages declare Node 20+. OpenRouter and GitHub credentials are optional unless those flows are enabled. Full setup and import-rehearsal instructions live in `db/README.md`.

```bash
git clone https://github.com/MajesteitBart/Strap.git strap
cd strap
npm ci
cp .env.example .env.local
# Generate independent secrets (see below), then:
npm run db:up
npm run db:migrate
npm run db:ping
npm run dev
```

`npm run db:up` starts the local Postgres 17 container from `docker-compose.yml`, bound to loopback `127.0.0.1:55433` and persisted in its own volume. The default `DATABASE_URL` is `postgresql://strap:strap-local-only@127.0.0.1:55433/strap`; that password is for local development only. `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` must both be `http://localhost:3000` locally. Hosted deployments require a TLS connection through a transaction pooler; the driver uses one connection, disables prepared statements, and verifies the server certificate (set `DATABASE_SSL_CA` for a private CA; hostname and certificate verification remain mandatory).

Generate separate, independent secrets before starting the app:

- `BETTER_AUTH_SECRET` (Better Auth sessions; at least 32 characters)
- `STRAP_ENCRYPTION_SECRET` (32-byte base64; encrypts provider/agent tokens at rest)
- `STRAP_VAULT_SECRET` (independent 32-byte key for Vault encryption)
- `STRAP_MAINTENANCE_SECRET` (independent; bearer secret for the maintenance endpoint)

Back these keys up with the database: replacing a key does not rotate existing ciphertext. New configuration uses `STRAP_ENCRYPTION_SECRET` and `STRAP_AGENT_MODEL`; existing `CREED_ENCRYPTION_SECRET` and `CREED_AGENT_MODEL` values remain lower-priority fallbacks. Canonical direct APIs live under `/api/strap/**`, and MCP discovery uses Strap tools, prompts, and `strap://profile`. `/api/creed/**`, `creed_*`, `creed://profile`, and other Creed-named identifiers remain compatibility contracts. Every optional variable is documented in `.env.example`; never read, print, or commit `.env.local`.

Email requires Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) for verification, password reset, and Company invitation mail; tests capture links in memory without sending. Google and X sign-in use their own optional OAuth credentials (`GOOGLE_*`, `X_*`); GitHub repo sync uses a separate GitHub OAuth App (`GITHUB_OAUTH_*`).

### One-time Supabase to Postgres import (cutover context only)

Existing installations moving from the previous Supabase backend require a scripted import rehearsal and a separate cutover window; this is not a normal setup step and has only been exercised locally. Set `STRAP_SOURCE_DATABASE_URL` (and optionally `STRAP_SOURCE_DATABASE_SSL_CA`) in `.env.local`, then run `node scripts/migrate-from-supabase.mts` to print counts, or `node scripts/migrate-from-supabase.mts --apply` to import. The importer reads a read-only source snapshot, re-encrypts Vault plaintext in memory, imports in one transaction, reconciles every table, and resets identity sequences; there is deliberately no force/overwrite flag and sessions are not migrated. Production import, live Google/X sign-in, real delivered emails, final authorization review, and the scheduled cutover remain release gates.

## Root checks

```bash
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
npm run audit:brand
```

`npm test` skips database suites when `DATABASE_URL` is unset. Use `npm run test:db` for database-backed suites: it creates a random `strap_test_<id>` database per suite and drops only that database afterward, so the local role needs `CREATEDB` and existing application data is never truncated. `npm run verify:local` checks a running localhost app with a fresh synthetic account and cleans up its own account afterward.

Both CLI packages are intentionally excluded from the root TypeScript project and require independent checks. For the primary Strap CLI:

```bash
npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm pack ./packages/strap --dry-run
```

## Database and schema changes

For schema changes use Drizzle's forward-only workflow: `npm run db:generate -- --name=<change>`, review the generated SQL, `npm run db:migrate`, then `npm run test:db`. `db/migrations/0000_baseline.sql` is the single squashed baseline; future changes are additive migrations under `db/migrations/`. Do not rename historical tables, columns, functions, or migrations to match public branding. Function edits require a SQL migration and an update to the reference file because Drizzle does not generate function migrations. Do not use `npx supabase db reset` or any Supabase CLI command; Supabase is no longer used.

## Use the Strap CLI

```bash
npm install --global @bvdm/strap
strap

# Or without installation
npx @bvdm/strap
npx @bvdm/strap --agent codex call read_strap --json
```

The default MCP server is `https://strap.bvdm.ai/mcp`. The CLI discovers live tools, resources, prompts, and schemas rather than hard-coding the server surface. See `packages/strap/README.md`.

`packages/creed-cli/` is a separate legacy compatibility package. It has different executable names, default server, environment variables, and credential storage. The two CLIs do not share or migrate credentials.

## Profile files and GitHub compatibility

- New Personal and Company integrations default to `strap.md` (`lib/profile-file.ts`).
- An absent path or configured `strap.md` reads candidates in order: `strap.md`, then legacy `creed.md`.
- Any other explicit stored path, including `creed.md`, is read exactly, without fallback.
- A push refuses to create a competing `strap.md` beside a fallback-resolved `creed.md`; migration must be explicit.
- Company supports GitHub push, not pull. Personal pull retains archived sections and imports active sections with proposal-level agent permission.

## Repository orientation

- `app/`: pages, browser APIs, OAuth/device endpoints, direct HTTP routes, and MCP server.
- `app/(strap-app)/`: signed-in product (`/file`, `/connections`, `/vault`, `/settings`, `/skills`), gated by its own layout, not the root.
- `components/strap/`: authenticated Strap UI, including `strap-provider.tsx` and `strap-switcher.tsx`.
- `lib/strap-*.ts`, `lib/company-*.ts`, and `lib/validation/strap-state.ts`: canonical domain, persistence, permission, and validation implementations; old `lib/creed-*` modules are deprecated compatibility re-export shims.
- `lib/authz/`: explicit row and mutation guards that replace the former RLS policies.
- `lib/db/`: database client, viewer/service contexts, scoped repositories, and migration tooling.
- `lib/auth/`: Better Auth server and client.
- `lib/oauth.ts`, `lib/oauth-device.ts`, `lib/headless-access.ts`: browser/device OAuth and scoped key resolution.
- `lib/api-key-vault.ts`: authorized app-encrypted Vault operations and reveal auditing.
- `lib/profile-file.ts`: canonical `strap.md` default and legacy fallback policy.
- `db/schema/`: canonical Drizzle schema. `db/migrations/`: squashed baseline and forward-only migrations.
- `packages/strap/`: primary `@bvdm/strap` MCP terminal client.
- `packages/creed-cli/`: legacy CLI compatibility package only.
- `tests/`: root contract, policy, migration, branding, and logic tests.

The canonical GitHub repository is [MajesteitBart/Strap](https://github.com/MajesteitBart/Strap). Treat `MajesteitBart/Creed` as historical only when it appears in explicit historical evidence.

## Core invariants

1. **Curated context, not append-only memory.** Strap is one compact, permission-aware profile worth reading, not a notes app, journal, or chat-memory store.
2. **`requireApiAuth()` on every `/api/app/*` route.** Browser APIs authenticate a Better Auth session; every route resolves the user and a viewer context before returning data.
3. **Hashed-token verification on every `/api/strap/*`, `/api/creed/*`, and `/mcp` route.** Agent APIs accept only an `Authorization: Bearer` token (the legacy `?token=` query fallback was removed). Modern OAuth tokens and `strap_key_` keys must also resolve an explicit profile grant and mode before dispatch; `creed_key_` remains an accepted compatibility prefix.
4. **Modern credentials bind exactly one Personal/Company grant + a mode ceiling.** A credential mode (`read-only`, `proposal-only`, `direct`) can only narrow live membership and per-section permissions, never elevate them, and fails narrow when that grant becomes inaccessible.
5. **Viewer contexts enforce app-level row scope; service contexts bypass it and require a named purpose.** `viewerContext` (session or resolved agent) applies the `lib/authz/` predicates equivalent to the former RLS policies; `serviceContext(purpose)` returns `true` for row scope and is server-only, used after an explicit credential/membership/role guard. Unknown tables/actions deny by default.
6. **Marketing routes must not load account state.** The root layout stays static; the dynamic, user-specific boundary lives in `app/(strap-app)/layout.tsx` and `AuthedProviders`. `proxy.ts` sets `x-pathname` so request handling can distinguish marketing from app routes, and `/` short-circuits signed-out visitors to `/home` without auth round-trips.
7. **Vault plaintext stays inside its narrow reveal boundary.** Vault lists, logs, audits, and ordinary MCP responses contain metadata or `secret://` references, never secret values; plaintext crosses memory only during explicit create, rotation, or audited reveal.
8. **Schema is forward-only with historical Creed/Stripe names preserved.** Use `npm run db:generate -- --name=<change>`, review the SQL, `npm run db:migrate`, then `npm run test:db`. Do not rename historical tables, columns, functions, or migrations.
9. **MCP discovery is Strap-first but exact Creed compatibility aliases remain.** Strap tools, prompts, and `strap://profile` are canonical; `creed_*` tools, `creed://` resources, `/api/creed` routes, `creed_key_` credentials, and Creed-named database/internal identifiers stay supported compatibility contracts.
10. **No personal info in source, no em dashes in product copy, no `console.log` in committed code.** Email/handles/names go through `lib/branding.ts` env vars; use `lib/observability.ts` for server logging.
