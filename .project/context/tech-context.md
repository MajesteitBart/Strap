# Tech Context

## Stack
- Next.js 16.3.5 App Router, React 19, and strict TypeScript. Development uses Turbopack; production builds use Webpack so Netlify can package the generated middleware runtime reliably. Matching Next tooling and compatible editor/transport dependency fixes remove the advisories reported on 2026-09-13.
- Tailwind CSS v4, shadcn-style primitives, Tiptap, Framer Motion and `motion/react`.
- Postgres 17, Drizzle, Better Auth, explicit authorization, app-encrypted Vault, database avatars and HTTP polling.
- Node 22+ application and `node:test` test suite; the new `@bvdm/strap` CLI lives in `packages/strap/`, while `packages/creed-cli/` remains the legacy package.

## Runtime Constraints
- `.env.local` is the canonical configuration for this checkout and must never be printed or committed.
- New deployments use `STRAP_ENCRYPTION_SECRET` and `STRAP_AGENT_MODEL`; existing `CREED_ENCRYPTION_SECRET` and `CREED_AGENT_MODEL` values remain lower-priority compatibility fallbacks.
- The root web-app TypeScript project excludes `packages/strap/` and `packages/creed-cli/`; each independent CLI package owns its dependency install, build, tests, and type-check.
- Use `npm run db:migrate` and `npm run test:db` against local Postgres. Hosted operations remain a separate cutover step.
- Default to server components. Client components require a hook, browser API, or interactive event.
- Marketing rendering must preserve the `x-pathname` gate and avoid user-state fan-out.
- TypeScript stays strict with no `any`; server logging uses `lib/observability.ts` rather than `console.log`.

## Integration Points
- Shared skills use retained SECURITY INVOKER database functions that check live profile membership and publish revision-checked bundles atomically. Only server operations dispatch these functions; browser requests never receive a direct database connection.
- `packages/strap/src/skills/bundle.ts` is the shared app/CLI validator, using pinned yaml 2.9.1 with alias expansion disabled. Libraries retain 100 skills and up to 20 complete versions per skill; each bundle is limited to 128 files and 2 MiB. The follow-up `20260913153559_bound_skill_storage.sql` caches metadata outside full file payloads and serializes a 64 MiB encoded-data quota across current bundles and history, pruning oldest historical copies while preserving every current revision. Importing the validator intentionally brings it into the app type-check despite the broader CLI exclusion.
- Better Auth for sessions, Postgres/Drizzle for persistence, lib/authz for guards, polling for Company updates and a secured maintenance route for retention.
- OpenRouter for AI synthesis and quality features, including encrypted BYOK and platform-credit paths.
- Stripe is optional legacy offboarding only. Checkout, new paid plans, top-ups, and webhooks are retired. Owner-authenticated status and period-end cancellation use `STRIPE_SECRET_KEY`; without it the UI directs existing subscribers to support. Responses and audit records never expose provider identifiers or credentials.
- Company provisioning creates the profile and owner membership in one transaction through a service-role-only RPC. Apply the additive `20260913092518_provision_company_atomic.sql` migration before deploying its caller; historic migration files remain immutable.
- GitHub OAuth and repository APIs for `strap.md` synchronization with stored-path authority and a non-divergent `creed.md` fallback.
- OAuth 2.1, MCP, bearer-token compatibility APIs, and `packages/strap/` for new agent connectivity.
- OAuth browser and device grants plus scoped `strap_key_` API keys resolve one explicit profile and a maximum access mode before MCP dispatch; `creed_key_` remains an accepted compatibility prefix.
- Application AES-256-GCM encryption stores Vault values in Postgres behind signed-in, authorized, audited reveal operations; lists and ordinary context expose metadata or references only.
- Delano uses `.project/` as delivery truth, `.agents/` as its canonical runtime, and `.codex/hooks.json` as an opt-in session hook.
- Hosted migration history alone does not prove effective database privileges. A 2026-09-13 audit found older service-only RPC grants had drifted; the existing migration-defined grants were restored and verified with `has_function_privilege`. Check effective client and service execution rights after hosted schema changes.

## Hosted migration rehearsal (2026-09-16)

Railway hosts Postgres 18 with a transaction-mode PgBouncer service. The PR preview uses an isolated source-copy rehearsal database. Production Netlify still runs the Supabase release. Verified TLS uses DATABASE_SSL_CA for the stable pooler certificate (renew before September 2027); source imports use a separate STRAP_SOURCE_DATABASE_SSL_CA. BWS stores the database credentials and encryption keys. See db/README.md and the remove-supabase cutover checklist before changing production.

## Production recovery (2026-09-16)

PR 16 is merged. Production now uses Railway after recovery from missing production-only settings. Deployment 6aaa5b6404a1115f9c4953e9 has healthy DB/auth, existing password login, legacy bearer reads and audited Vault reveal. Supabase is retained for rollback. Live Google/X and delivered-email checks remain open. See `.project/projects/remove-supabase/updates/2026-09-16-production-recovery.md`. Earlier rehearsal-only notes describe the pre-cutover state.
