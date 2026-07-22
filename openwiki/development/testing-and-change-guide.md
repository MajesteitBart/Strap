# Testing and change guide

## Standard verification

Run the root application checks:

```bash
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
```

Run CLI checks separately:

```bash
npm --prefix packages/creed-cli test
npm --prefix packages/creed-cli run typecheck
```

For database changes:

```bash
npx supabase db reset
```

Then exercise affected routes/UI locally. For API mutations, verify authentication, failure status, expected audit/activity records, and permission behavior. OpenWiki documentation refreshes are run manually and do not run application tests.

## Test map

| Area | Representative tests |
|---|---|
| Company rules | `company-permissions`, `company-onboarding`, `company-proposal-drafts` |
| Schema hardening | `company-p0-migrations`, `headless-access-vault` |
| Editing and rich text | `editing-system`, `rich-text-equivalence`, `section-suggestions` |
| GitHub format | `github-roundtrip` |
| Agent/AI behavior | `panel-*`, `tab-completion`, `quality-scope` |
| MCP/connections | `connection-actions`, `mcp-connection-status`, `mcp-health-filter`, `agent-icon` |
| Product utilities | `nexus-graph`, `roadmap` |
| CLI | `packages/creed-cli/tests/**` |

Most root tests exercise pure functions, parsers, or migration text. They do not replace browser, live Supabase/RLS/Vault, OAuth, GitHub, or OpenRouter integration testing.

## Change map

### Editor, sections, and review

Start with `components/creed/file-screen.tsx`, `rich-text-editor.tsx`, `creed-provider.tsx`, `lib/creed-data.ts`, `lib/rich-text.ts`, and relevant section/proposal routes. Check Personal and Company separately, including structural proposals, optimistic state, stale revisions, history, suggestions, and agent-originated updates.

### Company permissions and administration

Start with `lib/creed-permissions.ts`, `lib/company-sections.ts`, `lib/company-admin.ts`, `lib/company-invites.ts`, settings UI, and the company migrations. Maintain the TypeScript/SQL policy twin. Include owner/admin/member, hidden/read/propose/direct, invitation capacity, and concurrent revision cases.

### OAuth, MCP, and connections

Start with `app/mcp/route.ts`, `lib/oauth.ts`, `lib/headless-access.ts`, `lib/oauth-device.ts`, OAuth/device routes, connection status/health helpers, and CLI client tests. Preserve PKCE, redirect validation, one-time code/device consumption, polling backoff, rotation/revocation, explicit Creed grants, headless mode clamping, hidden-section filtering, legacy-only Personal fallback, digested rate-limit identifiers, and CLI attribution. Exercise at least two real MCP clients when changing the universal agent contract or protocol response shapes.

### API-key Vault

Start with `lib/api-key-vault.ts`, `app/api/app/vault/**`, `components/creed/api-key-vault-screen.tsx`, and `supabase/migrations/20260722120000_headless_access_and_secret_vault.sql`. Verify signed-in access, Personal versus Company owner/admin/member behavior, item-to-Creed authorization, metadata-only listing, create/reveal/rotate/delete RPCs, no-store responses, 30-second UI hiding, and fail-closed reveal auditing. Run a local Supabase reset: `headless-access-vault.test.ts` mostly checks helpers and source text, not live Vault or route behavior.

### AI and credits

Start with the feature route plus `lib/ai/openrouter.ts`, `credits.ts`, `persistence.ts`, model catalog, and permission-aware action execution. Check BYOK/platform modes, streaming/non-streaming behavior, timeout/abort, malformed output, and accounting failures after successful inference.

### GitHub sync

Start with `lib/creed-markdown.ts`, `lib/rich-text.ts`, GitHub route handlers/modules, and `github-roundtrip.test.ts`. Verify heading levels, accent comments, supported rich text, SHA conflict behavior, Personal preview/apply, company push, and token refresh.

### Public site or routing

Start with the target marketing component, `lib/marketing-routes.ts`, `proxy.ts`, root layout, and `next.config.ts`. Marketing pages must not trigger user-state fan-out. Confirm cache/CSP/image policy and mobile behavior.

## High-risk areas

- `components/creed/file-screen.tsx`, `creed-provider.tsx`, and settings components contain large cross-feature state machines.
- `lib/creed-data.ts` mixes durable domain types, transforms, defaults, and the contract shipped to every agent.
- `lib/creed-backend.ts` maps many schema generations and Personal workflows.
- `app/mcp/route.ts` combines protocol, auth, policy, state, and dispatch.
- `lib/company-sections.ts` owns service-role writes, permissions, proposal review, revisions, history, and collaboration effects.
- Markdown parsing is regex/order-sensitive; format changes can silently normalize or lose content.
- Company synchronization intentionally combines optimistic updates, realtime, polling, suppression, and freeze windows to handle races.

Read the whole local code path before editing a helper in these files. Avoid adding dependencies without a concrete size/maintenance justification.

## Known coverage gaps

High-value additions would cover:

- OAuth discovery, PKCE replay, redirects, refresh rotation, device polling/consumption, and revocation end to end;
- MCP authentication and tool authorization for OAuth and headless keys against live schema/RLS;
- proving every `app/api/app/**` route authenticates correctly, including Vault role checks and required reveal auditing;
- executing Supabase Vault create/reveal/rotate/delete and device RPC concurrency against a local database;
- GitHub OAuth/refresh and preview/apply races;
- OpenRouter SSE parsing, timeout, malformed structured output, and credit concurrency;
- browser-level Personal/Company switching, onboarding, collaboration, and proposal review.

## Documentation cautions

Some root guidance predates current code:

- The test runner is wired in `package.json`, but OpenWiki refresh is manual and does not run application verification.
- Signed-in users without access are currently sent to onboarding by the app layout, not always pricing.
- Company onboarding and code size have outgrown older repository maps.
- GitHub round-trip is precise for supported editor markup, not universally byte-lossless.

Prefer current source, package scripts, and ordered migrations over stale comments. Preserve unrelated working-tree changes, especially root agent instruction files, unless the user explicitly asks to modify them.
