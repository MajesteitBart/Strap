# Testing and change guide

## Standard verification

```bash
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
npm run audit:brand

npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm pack ./packages/strap --dry-run
```

The root `tsconfig.json` excludes CLI packages so Netlify/root builds do not compile their Node-specific code. Root typecheck therefore does not validate `packages/strap`; run package checks explicitly. When legacy CLI compatibility changes, also run:

```bash
npm --prefix packages/creed-cli run typecheck
npm --prefix packages/creed-cli test
```

For database changes run `npx supabase db reset`, then exercise affected routes/UI. OpenWiki maintenance itself does not run application tests.

## Focused test map

| Area | Representative tests |
|---|---|
| Strap naming/protocol | `strap-brand`, `strap-protocol-compatibility`, `strap-agent-contract` |
| Profile defaults/GitHub | `strap-profile-defaults-migration`, `profile-file`, `github-roundtrip` |
| OAuth, keys, Vault | `headless-access-vault`, `mcp-connection-status`, `mcp-health-filter`, `connection-actions` |
| Company policy | `company-permissions`, `company-onboarding`, `company-proposal-drafts` |
| Editor/rich text | `editing-system`, `rich-text-equivalence`, `section-suggestions` |
| AI/agent behavior | `panel-*`, `tab-completion`, `quality-scope`, `openrouter-routing` |
| Primary CLI | `packages/strap/tests/**` |
| Legacy CLI | `packages/creed-cli/tests/**` |

Most root tests exercise pure functions, contracts, migration text, or source invariants. They do not replace browser, live Supabase/RLS/Vault, OAuth, GitHub, or OpenRouter integration testing.

## Change map

### Product naming and compatibility

Start with `lib/marketing/brand.ts`, `lib/profile-file.ts`, `app/mcp/route.ts`, `/api/strap/**`, and `scripts/check-strap-rebrand.mts`. New customer-facing vocabulary and implementation paths are Strap, but preserve exact compatibility/history identifiers: Creed database objects, migrations, deprecated `lib/creed-*` compatibility re-export shims, `/api/creed/**` compatibility APIs, `creed_*`, `creed://`, existing `creed_key_`, and `packages/creed-cli`. Do not remove compatibility paths as a drive-by cleanup. Repository and GitHub references must use `https://github.com/MajesteitBart/Strap`; retain the old remote name only in explicit historical evidence.

### OAuth, MCP, connections, and CLI

Verify PKCE, redirect validation, one-time code/device consumption, polling backoff, token rotation/revocation, explicit Personal/Company grants, all three mode ceilings, hidden-section filtering, fail-narrow modern grants, and legacy-only Personal fallback. Check canonical Strap discovery and every exact compatibility alias through the same dispatcher. Test `packages/strap` separately and exercise real MCP clients for protocol changes.

### Vault

Start with `lib/api-key-vault.ts`, `app/api/app/vault/**`, `components/strap/api-key-vault-screen.tsx`, and Vault migrations. Verify metadata-only list, Personal and Company owner/admin/member behavior, item-loaded authorization, service-role-only RPCs, create/reveal/rotate/delete, no-store responses, 30-second UI clearing, and fail-closed reveal audit. Remember that Vault protects storage; explicit operations carry plaintext through bounded server/browser memory.

### Profile files and GitHub

Start with `lib/profile-file.ts`, `lib/strap-markdown.ts`, GitHub modules/routes, and profile/GitHub tests. `lib/creed-markdown.ts` is only a deprecated compatibility re-export shim. Verify new `strap.md` defaults, fallback read to `creed.md`, custom paths, no parallel-file push, SHA conflicts, Personal preview/apply, Company push, and formatting round trips.

### Free-plan and AI behavior

Pricing facts live in `lib/marketing/pricing.ts`: all current plans are `$0 forever`. There is no Stripe runtime. Treat Stripe-named migrations and billing records as history unless active source proves otherwise. AI still has included-key/BYOK, usage, quota, routing, and persistence behavior. Included AI uses a process-local 20-request/60-second burst limit and a default `$0.50` estimated-cost ceiling over the trailing 24 hours per user, configurable with `INCLUDED_AI_DAILY_LIMIT_USD`; absent `OPENROUTER_PLATFORM_KEY` requires BYOK. Test provider errors and usage accounting independently from customer billing.

### Sections and Company policy

Read `components/strap/file-screen.tsx`, `components/strap/strap-provider.tsx`, `lib/strap-data.ts`, `lib/strap-permissions.ts`, `lib/validation/strap-state.ts`, and `lib/company-sections.ts`. Verify Personal/Company separately, direct/proposal behavior, revision conflicts, hidden sections, version history, and TypeScript/SQL policy equivalence.

## High-risk and known gaps

High-risk files include `app/mcp/route.ts`, `lib/strap-data.ts`, `lib/company-sections.ts`, editor/provider orchestration, and Markdown parsing. Compatibility aliases, security policy, and agent instructions make small-looking changes broad.

Coverage gaps remain around end-to-end OAuth/device flows, live MCP authorization, RLS/Vault RPC execution and concurrency, GitHub OAuth/pull races, OpenRouter streaming/failure behavior, and browser-level Personal/Company collaboration. Verify current source and ordered migrations over stale comments or historical names.
