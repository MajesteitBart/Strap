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

Then exercise affected routes/UI locally. For API mutations, verify authentication, failure status, expected audit/activity records, and frozen/permission behavior. The root Node test runner exists, but no repository workflow was found that runs it automatically.

## Test map

| Area | Representative tests |
|---|---|
| Company rules | `company-permissions`, `company-onboarding`, `company-proposal-drafts` |
| Schema hardening | `company-p0-migrations` |
| Editing and rich text | `editing-system`, `rich-text-equivalence`, `section-suggestions` |
| GitHub format | `github-roundtrip` |
| Agent/AI behavior | `panel-*`, `tab-completion`, `quality-scope` |
| MCP/connections | `connection-actions`, `mcp-connection-status`, `mcp-health-filter`, `agent-icon` |
| Product utilities | `nexus-graph`, `roadmap`, `refund-handling` |
| CLI | `packages/creed-cli/tests/**` |

Most root tests exercise pure functions, parsers, or migration text. They do not replace browser, live Supabase/RLS, OAuth, Stripe webhook, GitHub, or OpenRouter integration testing.

## Change map

### Editor, sections, and review

Start with `components/creed/file-screen.tsx`, `rich-text-editor.tsx`, `creed-provider.tsx`, `lib/creed-data.ts`, `lib/rich-text.ts`, and relevant section/proposal routes. Check Personal and Company separately, including structural proposals, optimistic state, stale revisions, history, suggestions, and agent-originated updates.

### Company permissions and administration

Start with `lib/creed-permissions.ts`, `lib/company-sections.ts`, `lib/company-admin.ts`, `lib/company-invites.ts`, settings UI, and the company migrations. Maintain the TypeScript/SQL policy twin. Include owner/admin/member, hidden/read/propose/direct, frozen billing, seat capacity, and concurrent revision cases.

### OAuth, MCP, and connections

Start with `app/mcp/route.ts`, `lib/oauth.ts`, OAuth routes, connection status/health helpers, and CLI client tests. Preserve PKCE, redirect validation, one-time code redemption, rotation/revocation, Creed grant narrowing, hidden-section filtering, and CLI attribution. Exercise at least two real MCP clients when changing the universal agent contract or protocol response shapes.

### AI and credits

Start with the feature route plus `lib/ai/openrouter.ts`, `credits.ts`, `persistence.ts`, model catalog, and permission-aware action execution. Check BYOK/platform modes, streaming/non-streaming behavior, timeout/abort, malformed output, frozen company state, and accounting failures after successful inference.

### Billing and seats

Start with Stripe routes, `lib/stripe.ts`, `lib/company-billing.ts`, webhook metadata, and RPC migrations. Treat the signed webhook as authoritative. Verify idempotency, partial/full refunds, subscription state, company freeze/recovery, top-up duplication, and seat/invite concurrency.

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

- OAuth discovery, PKCE replay, redirects, refresh rotation, and revocation end to end;
- MCP authentication and tool authorization against live schema/RLS;
- proving every `app/api/app/**` route authenticates correctly;
- Stripe signed webhook routing and provisioning idempotency;
- GitHub OAuth/refresh and preview/apply races;
- OpenRouter SSE parsing, timeout, malformed structured output, and credit concurrency;
- browser-level Personal/Company switching, onboarding, collaboration, and proposal review.

## Documentation cautions

Some root guidance predates current code:

- The test runner is wired in `package.json`, despite older prose saying tests do not exist; automated CI execution was not found.
- Signed-in users without access are currently sent to onboarding by the app layout, not always pricing.
- Company onboarding and code size have outgrown older repository maps.
- GitHub round-trip is precise for supported editor markup, not universally byte-lossless.

Prefer current source, package scripts, and ordered migrations over stale comments. Preserve unrelated working-tree changes, especially root agent instruction files, unless the user explicitly asks to modify them.
