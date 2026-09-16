---
type: Reference
title: Platform integrations
description: Postgres + Drizzle + Better Auth backend, OpenRouter included/BYOK AI, GitHub version control, Resend email, free-tier pricing, the removed Stripe runtime, configuration, and deployment.
tags: [integrations, postgres, better-auth, openrouter, github, resend, pricing, deployment]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-16T08:01:49.714Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-01bc8e5c8935088be74dcd29
    resource: repo://app/api/app/company/route.ts
  - id: openwiki-source-345d60438a68802d80540e50
    resource: repo://app/api/app/github/authorize/route.ts
  - id: openwiki-source-3c2cc6be923e1ebc861cea29
    resource: repo://app/api/app/github/pull/apply/route.ts
  - id: openwiki-source-8f55c6f7e5cd5bee83c8f0a9
    resource: repo://app/api/app/github/pull/preview/route.ts
  - id: openwiki-source-06741947290ecca669fc6f0e
    resource: repo://app/api/app/github/push/route.ts
  - id: openwiki-source-ca91fd4c958e7abab1225947
    resource: repo://app/auth/github/callback/route.ts
  - id: openwiki-source-ad0d105a6a253eb941c2d8f8
    resource: repo://db/migrations/0000_baseline.sql
  - id: openwiki-source-c8e713343ca58b6416089698
    resource: repo://db/README.md
  - id: openwiki-source-b79fbbd921df689b4bbdc82f
    resource: repo://docker-compose.yml
  - id: openwiki-source-3c875c7b33901a5580e16e2e
    resource: repo://lib/ai/credits.ts
  - id: openwiki-source-65101b2d139f9d33f5d802e8
    resource: repo://lib/ai/model-catalog.ts
  - id: openwiki-source-060559303f62cd52b2da8325
    resource: repo://lib/ai/openrouter-routing.ts
  - id: openwiki-source-04b0bb09907ae115c32538a6
    resource: repo://lib/ai/openrouter.ts
  - id: openwiki-source-105cba417a37a07dc1e2ac72
    resource: repo://lib/ai/persistence.ts
  - id: openwiki-source-8bdb5c764936862dcf26a9be
    resource: repo://lib/auth/create-auth.ts
  - id: openwiki-source-aaeda56d3db31cf8a9690187
    resource: repo://lib/authz/policies.ts
  - id: openwiki-source-87d304aa9accaf2dd7700a8e
    resource: repo://lib/company-github.ts
  - id: openwiki-source-5608be7e57ec6233359e20fe
    resource: repo://lib/creed-markdown.ts
  - id: openwiki-source-fa06cd55a8b1c63c50fd6b1d
    resource: repo://lib/email.ts
  - id: openwiki-source-1a1a00260a6e5f28e8f26c29
    resource: repo://lib/github-version-control.ts
  - id: openwiki-source-5294a0bef869ea0157cd1653
    resource: repo://lib/github.ts
  - id: openwiki-source-9d52ff72972dc8408f26e80d
    resource: repo://lib/legacy-subscription-deletion.ts
  - id: openwiki-source-1016046123577acb5e5755cf
    resource: repo://lib/legacy-subscriptions.ts
  - id: openwiki-source-bc645324ab543da4d1fc9b0b
    resource: repo://lib/marketing/pricing.ts
  - id: openwiki-source-8e25abfc07a96138e8098ebd
    resource: repo://lib/profile-file.ts
  - id: openwiki-source-c1f455c2488e681e5d392f65
    resource: repo://lib/secret-crypto.ts
  - id: openwiki-source-c27e0d898c08c1f56f8090b0
    resource: repo://lib/strap-markdown.ts
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-799671dfaa313b7772f85d23
    resource: repo://scripts/migrate-from-supabase.mts
  - id: openwiki-source-03d518070c9473f2601eddf8
    resource: repo://tests/github-roundtrip.test.ts
generated: { by: "openwiki/0.5.2", at: "2026-09-16T08:01:49.714Z" }
---

# Platform integrations

Strap is a Next.js app with a plain Postgres backend, server-rendered Better Auth, OpenRouter-backed AI, GitHub-based profile sync, and Resend transactional email. There is no database REST endpoint, no row-level security, and no runtime payment system. Browsers never touch the database directly: every integration runs through authenticated server routes that enforce application authorization before data is returned. See [Schema and security](../data/schema-and-security.md) for the authorization predicates and the plaintext boundary.

## Postgres, Drizzle, and Better Auth

Strap uses Postgres 17 locally and 18 on Railway, accessed through the Drizzle ORM. `docker-compose.yml` runs a loopback-bound `postgres:17.6-alpine` on `127.0.0.1:55433` with its own persistent volume; the example `DATABASE_URL` is for that local container only. Hosted deployments connect through a TLS-verified transaction pooler — the driver uses a single connection and disables prepared statements — and Railway co-hosts Postgres 18 with a transaction-mode PgBouncer. Set `DATABASE_SSL_CA` to a private CA certificate when one is used; hostname and certificate verification remain mandatory even then.

Better Auth (`lib/auth/create-auth.ts`) drives email/password and social sign-in over a Drizzle adapter:

- Email/password is enabled with `requireEmailVerification: true`; password resets revoke existing sessions (`revokeSessionsOnPasswordReset: true`).
- An `after` hook on `/sign-in/email` upgrades imported legacy bcrypt hashes to the current hasher on the first successful sign-in of the credential account, guarded by an optimistic-concurrency `WHERE password = <old>` so a concurrent reset wins.
- Social providers are Google and X, configured through `GOOGLE_CLIENT_ID/SECRET` and `X_CLIENT_ID/SECRET`. Account linking is trusted for Google only.
- Sessions use a 60-second cookie cache. Rate limiting is database-backed (100 requests / 60s window).

Authorization is enforced in application code, not the database. `lib/authz/policies.ts` builds SQL row scopes — the application equivalents of the retired RLS policies — that gate every Drizzle query by actor kind (service, anonymous, viewer), ownership, and Company role. Company AI settings and billing rows are owner-only; AI usage inserts are owner-scoped; section content writes require the personal owner. The service context bypasses scopes (used for admin reads of company-owned rows after an app-level role check).

Migrations are the ordered SQL files in `db/migrations/`. `0000_baseline.sql` is the single squashed baseline; forward migrations are Drizzle-generated via `npm run db:generate`. Function edits require a hand-written SQL migration plus an update to the reference file, because Drizzle does not generate function migrations. Creed- and Stripe-named schema objects are intentionally **not** renamed during the Strap rebrand — they remain as forward-only history.

## OpenRouter: included AI and BYOK

AI routes live under `app/api/app/ai/**` (`agent`, `panel`, `quality`, `tab`, `usage`, `settings`, `openrouter-balance`). Each call resolves the active Strap and the caller's permission, picks a server-controlled model, builds bounded context, calls `lib/ai/openrouter.ts`, validates the response, and records usage.

### Credential resolution

Two credential modes exist, chosen from the user's `ai_mode` (`lib/ai/credits.ts`):

- **Included (`credits`)** — the deployment's `OPENROUTER_PLATFORM_KEY` runs first-party AI. The historical database value `ai_mode = 'credits'` is retained, but no credits are sold, debited, or prepaid. If no platform key is configured, `getOpenRouterPlatformKey()` throws a "not configured" error and users must use BYOK.
- **BYOK (`byok`)** — decrypts a valid Personal or Company OpenRouter key stored encrypted (`lib/secret-crypto.ts`). A BYOK key requires `key_status === 'valid'` (personal) or `present` (company); otherwise the resolver throws "Add an OpenRouter key in Settings".

`resolveAiCredential` reads personal settings; `resolveCompanyAiCredential` reads company settings via the service context (after the route has authorized membership). Both select the model server-side per feature — there is no in-app model picker.

### Operational limits, not billing

`lib/ai/credits.ts` keeps its historical filename but now enforces operational guardrails rather than billing:

- A **process-local burst limit** of 20 included-AI requests per user per 60 seconds (`checkRateLimit`).
- A **trailing-24-hour at-cost ceiling** of `$0.50` per user by default, overridable with `INCLUDED_AI_DAILY_LIMIT_USD`. The check sums `estimated_cost_usd` from `creed_ai_usage` for the user's `ai_mode = 'credits'` rows in the last 24h; BYOK calls never count toward it.

There is no debit RPC, prepaid balance, checkout, or runtime payment flow. Every call is still recorded into `creed_ai_usage` via `recordAiUsage` for visibility and quota: it stores the real at-cost `estimated_cost_usd`, a `charged_micro_usd` amount, token counts, model id/quality, feature, and the Strap id (Company usage is stamped with the Company Strap id so the company spend chart can attribute it; personal usage leaves it null).

### Model selection

`lib/ai/model-catalog.ts` selects the model per feature, hidden from users:

- Per-feature platform defaults: Analysis → `anthropic/claude-haiku-4.5`; Tab and Panel → `openai/gpt-oss-120b` (fast open-weights served by Groq/Cerebras, routed for throughput).
- Per-feature BYOK defaults stay on first-party OpenAI models (`openai/gpt-5`, `gpt-5.4-mini`) because BYOK keys are often provider-restricted and can't route to the platform defaults.
- Env overrides: `ANALYSIS_MODEL` / `TAB_MODEL` / `PANEL_MODEL` (platform), `BYOK_ANALYSIS_MODEL` / `BYOK_TAB_MODEL` / `BYOK_PANEL_MODEL` (BYOK). The Agent feature (`getAgentModelId`) overrides with `STRAP_AGENT_MODEL` (compatibility fallback `CREED_AGENT_MODEL`); BYOK agent defaults to `openai/gpt-5`.

### OpenRouter transport

`lib/ai/openrouter.ts` provides `callOpenRouter` (non-streaming) and `streamOpenRouter` (SSE streaming used by the Agent route). Both request `usage: { include: true }` so OpenRouter returns its authoritative billed cost; when absent, cost is re-estimated from the catalog. `lib/ai/openrouter-routing.ts` pins BYOK `openai/*` models to the native OpenAI route (`only: ["openai"]`, `allow_fallbacks: false`) so a funded provider key isn't silently rerouted to a fallback that spends OpenRouter credits. Common HTTP statuses are translated: 401 → "rejected your key", 402 → "out of credit" (mode-specific message), 429 → "rate-limiting". The `HTTP-Referer` header is derived from the deployed origin so forks attribute usage to their own domain.

### Privacy boundary

Profile content sent to OpenRouter crosses an external privacy boundary. BYOK keys are exposed client-side only as safe status/last-four metadata (`buildPublicAiSettings`); the encrypted key never leaves the server.

## GitHub version control

A single GitHub OAuth App backs **both** Personal and Company profile-sync connections (this is a repo integration, not a sign-in provider). The same client id/secret (`GITHUB_OAUTH_CLIENT_ID/SECRET`) and the same callback (`/auth/github/callback`) serve both flows; personal-vs-company is carried in the OAuth state.

### Connection flow

`/api/app/github/authorize` is a top-level navigation:

1. It requires an authenticated session and (for `mode=company`) verifies the caller is an owner/admin of the target Company (`getCreedRole`).
2. It mints a 24-byte nonce and stores `{ mode, creedId, nonce }` in a short-lived (`maxAge: 600`), httpOnly, same-site-lax cookie (`github_oauth_state`).
3. It redirects to GitHub with `scope=repo read:user` and `prompt=consent`.

`/auth/github/callback` verifies the cookie (single-use — deleted regardless of outcome), checks `state === nonce`, re-checks the session and (for company) the role, exchanges the code via `exchangeGitHubOAuthCode`, fetches the GitHub viewer, and stores the encrypted token: personal → `creed_integrations` (`upsertGitHubIntegration`, encrypts with `lib/secret-crypto.ts`); company → `creed_company_github_integration` (`upsertCompanyGitHubIntegration`, manager-only). Both land an audit event. Failures redirect back to `/settings` with a reason rather than returning JSON.

### Token refresh

`lib/github-version-control.ts` (`withAuthenticatedGitHubAccess`) and `lib/company-github.ts` (`withCompanyGitHubAccess`) wrap GitHub operations. They proactively refresh a token ~2 minutes before expiry and retry **once** with a forced refresh when GitHub returns a "bad credentials / expired token / 401" error. A malformed or undecryptable company token degrades to "not connected" rather than throwing, so a key rotation prompts a reconnect. Refresh requires the OAuth client credentials to be configured.

### Profile path resolution

New Personal and Company configurations default to `strap.md` (the `path` column defaults to `'strap.md'` in the baseline schema). `lib/profile-file.ts` controls compatibility:

- A blank or `strap.md` configured path tries `strap.md`, then legacy `creed.md` (`getProfilePathCandidates`).
- Any other stored path is exact — no fallback.
- Push refuses to create a competing `strap.md` when a read resolved legacy `creed.md` (`hasProfilePathConflict` → 409).

### Push

Push (`POST /api/app/github/push`) fetches the remote file snapshot for SHA/content-hash, refuses on a legacy-path conflict, then `pushGitHubFile` PUTs the base64 content through GitHub Contents **optimistic concurrency** (sending `sha` only when the file exists). The default commit message is `Update Strap`. Company managers push to the Company target on the **team's** GitHub token (never a personal token); personal Straps push on the user's own connection. After a successful push, sync bookkeeping (`lastRemoteSha`, `lastSyncedContentHash`, `syncStatus: "up-to-date"`) is written to the version-control row.

### Pull (personal only)

Personal pull has preview (`/api/app/github/pull/preview`) and apply (`/api/app/github/pull/apply`) phases:

- Preview parses the remote file with `parseStrapMarkdown` and returns sections + sync status (`resolveSyncStatus`: `up-to-date` / `local-ahead` / `remote-ahead` / `diverged` / `unknown`).
- Apply replaces active sections with the imported set, **clears proposals**, **retains archived sections** the import didn't reintroduce, and forces every imported section to `agentWritable: true` with `agentPermission: "propose"` so connected agents can edit post-pull. Section revisions reset to 1.

**Company pull is not implemented** — both preview and apply throw "Pulling from GitHub into a company Strap isn't supported yet." Company managers can only push out.

> **Stale-apply caveat:** preview/apply is not bound to a freshly fetched remote SHA. The client posts the previewed sections back to apply, so stale preview data can be applied if the remote changed between preview and apply. Maintain `tests/github-roundtrip.test.ts` and profile-path tests when changing this flow.

### Format

`lib/strap-markdown.ts` and `lib/rich-text.ts` serialize and parse the markdown: push shifts section-local headings down one level (`<h2>`→`###`) so the section's `## Name` stays top of hierarchy; pull un-shifts them back before delegating to `markdownToRichHtml`. The accent color survives the round-trip via an HTML comment `<!-- creed:accent=... -->` under the heading (read back and stripped on pull). Legacy section names (`stack`, `conventions`, `workflows`, …) map to canonical ids. `lib/creed-markdown.ts` is a deprecated re-export shim (`export * from "./strap-markdown.ts"`); format identifiers stay unchanged even though customer-facing defaults are Strap.

## Resend email

Transactional email — account verification, password resets, and Company invites — is sent via Resend's HTTP API in `lib/email.ts` (one `fetch` to `https://api.resend.com/emails`, no SDK). It **fails closed**: if `RESEND_API_KEY` or `RESEND_FROM_EMAIL` is unset, `sendEmail` returns `{ ok: false }` and logs, but never throws into the caller. This means a Company invite row is still created and can be resent even when the email send fails; the failure is surfaced to the inviter. `RESEND_FROM_EMAIL` must be an address on a Resend-verified domain. In tests, verification/reset links are captured in memory without sending mail. Password resets revoke existing sessions (enforced by Better Auth).

## Pricing and the removed Stripe runtime

`lib/marketing/pricing.ts` is the canonical plan source (`PLAN_FACTS`), shared by the pricing cards, the crawlable pricing reference, the `SoftwareApplication` Offer schema, and `/llms.txt`. Strap has no paid plans:

- **Open** — `$0 forever`, self-host the open source build, BYOK.
- **Personal** — `$0 forever`, hosted, included AI or BYOK.
- **Company** — `$0 forever`, hosted, included AI or Company BYOK, unlimited members.

Stripe has been removed from active dependencies, `.env.example`, and runtime routes. Company creation is direct and idempotent via `POST /api/app/company` (`provisionCompany`, one owned company per user; retries return the existing shell). Invites are not purchased seats.

Historical `creed_entitlements`, `creed_company_billing`, Stripe columns, and seat-purchase records remain as forward-only history — they do not describe current paid plans and must not be inferred as live billing. `lib/legacy-subscriptions.ts` and `lib/legacy-subscription-deletion.ts` support **owner-only legacy offboarding**: `requestLegacySubscription` / `cancelLegacySubscription` read and schedule `cancel_at_period_end` on pre-existing subscriptions (requires `STRIPE_SECRET_KEY`); `legacyDeletionBlocker` blocks account/Company deletion until every legacy subscription is ended or scheduled-to-cancel (`checkLegacyDeletion` inspects the cascading billing rows). Keep `STRIPE_SECRET_KEY` configured only until all legacy subscriptions are canceled.

## Supabase → Postgres import (cutover context)

`scripts/migrate-from-supabase.mts` is a one-time cutover tool, not a runtime integration. It reads `STRAP_SOURCE_DATABASE_URL` (with optional `STRAP_SOURCE_DATABASE_SSL_CA`) and `DATABASE_URL`:

- Default prints counts without importing; `--apply` imports into an **empty** target (hosted targets require `--target host:port/database` matching the connection string).
- It exports a read-only source snapshot, re-encrypts Vault plaintext **in memory** (no raw export file is written), imports in one transaction, reconciles all 37 application tables, resets identity sequences, and preserves IDs/hashes/ciphertext. There is deliberately **no force/overwrite flag**, and sessions are not migrated.

Production import and the scheduled cutover are separate release gates; this script is for rehearsal and cutover only.

## Configuration and deployment

`.env.example` is a **placeholder inventory only** — never read or expose `.env.local`. Secrets are read in Node-runtime route handlers; `NEXT_PUBLIC_*` values are bundled into client code, so only non-secret config goes there.

### Secret precedence (Strap wins)

| Purpose | Preferred | Compatibility fallback |
|---|---|---|
| Token/payload encryption (`lib/secret-crypto.ts`) | `STRAP_ENCRYPTION_SECRET` | `CREED_ENCRYPTION_SECRET` |
| Agent model override | `STRAP_AGENT_MODEL` | `CREED_AGENT_MODEL` |
| CSP enforcing switch | `STRAP_CSP_ENFORCE=1` | `CREED_CSP_ENFORCE=1` |
| Isolated dev build dir | `STRAP_DIST_DIR` | `CREED_DIST_DIR` |

When both forms are set, the Strap value wins. These are **separate** keys from the other required secrets: `BETTER_AUTH_SECRET` (session signing), `STRAP_VAULT_SECRET` (in-app Vault AES-256-GCM encryption, independent of `STRAP_ENCRYPTION_SECRET`), and `STRAP_MAINTENANCE_SECRET` (maintenance endpoint bearer). Back up these keys with the database — replacing a key does not rotate existing ciphertext.

### Hosted database

Hosted connections require verified TLS and a transaction pooler; the driver uses one connection and disables prepared statements. Railway hosts Postgres 18 and a transaction-mode PgBouncer. Set `DATABASE_SSL_CA` for a private CA (hostname/cert verification mandatory). `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` must both match the deployed origin in production (they fall back to `http://localhost:3000` in dev).

### Next.js

`next.config.ts` constrains known network origins (CSP `connect-src` allows only `self`, `api.openrouter.ai`, `openrouter.ai`, `api.github.com`; `frame-ancestors 'self'`). CSP ships as `Report-Only` by default; set `STRAP_CSP_ENFORCE=1` (or legacy `CREED_CSP_ENFORCE`) to switch to enforcing after watching a release cycle for violations. User-dependent routes (`/`, `/file/*`, `/onboarding/*`, `/connections/*`, `/vault/*`, `/settings/*`, …) are pinned `private, no-store` so a shared device can't serve one user's page to another after sign-out. Static brand assets under `/assets/*` are long-cached (`max-age=31536000, immutable`). Dev builds output to `.next-runtime` (or `STRAP_DIST_DIR`) so a second dev server doesn't race the primary's artifacts. Root `tsconfig.json` excludes both independent CLI packages.

### Optional integrations

- **GitHub** — leave `GITHUB_OAUTH_CLIENT_ID/SECRET` blank to hide "Connect GitHub" actions. Use a separate OAuth App per environment (one callback host each).
- **OpenRouter** — leave `OPENROUTER_PLATFORM_KEY` unset to disable included mode; the app still boots, but included calls return a friendly "not configured" until BYOK is set.
- **Resend** — without `RESEND_API_KEY`, invites still record but sends fail (surfaced to the inviter).
- **Feedback widget** — `MEDIAN_API_KEY` powers the in-app feedback receiver; without it the form returns 503 with a friendly message.
- **Status pill** — optional `NEXT_PUBLIC_RELEASE_SHA` and `STATUS_API_URL` surface a system-status indicator.

### Maintenance

`POST /api/internal/maintenance` requires `Authorization: Bearer <STRAP_MAINTENANCE_SECRET>`. It prunes activity older than 90 days and expired device/authorization codes, returning and logging counts only. The daily GitHub Actions workflow needs repository variable `STRAP_SITE_URL` and secret `STRAP_MAINTENANCE_SECRET` after deployment.

The Git remote and current repository/package metadata use [MajesteitBart/Strap](https://github.com/MajesteitBart/Strap). Retain `MajesteitBart/Creed` only when documenting explicit historical evidence.
