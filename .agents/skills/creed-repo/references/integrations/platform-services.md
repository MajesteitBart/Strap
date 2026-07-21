# Platform integrations

## Supabase

Supabase provides authentication, Postgres, RLS, realtime, and scheduled retention. Server components and ordinary app routes generally use a session client constrained by RLS. OAuth, webhooks, company writes, and secret-bearing integrations often use the admin client, which bypasses RLS and therefore depends on preceding application checks.

`proxy.ts` refreshes Supabase cookies for non-marketing requests. Client creation and environment validation live in `lib/supabase/`. The ordered SQL files under `supabase/migrations/` are the canonical schema, not generated TypeScript types.

See [Schema and security](../data/schema-and-security.md) for table and authorization details.

## OpenRouter and AI credits

AI features select between:

- the platform OpenRouter key plus prepaid Creed credits; or
- an encrypted user/company BYOK key.

Feature routes under `app/api/app/ai/**` resolve the active Creed and permissions, select a server-controlled model from `lib/ai/model-catalog.ts`, build bounded context, call `lib/ai/openrouter.ts`, parse/validate the response, and persist usage through `lib/ai/credits.ts` and `lib/ai/persistence.ts`.

Creed section content crosses an external privacy boundary when sent to OpenRouter. BYOK values are validated, encrypted, and only represented to the client by safe status/last-four metadata.

Credit accounting is postpaid: inference happens before the debit RPC. A debit or usage-persistence failure is logged without invalidating a successful model response. Positive-balance checks do not reserve the worst-case request cost, so concurrent calls can overspend. Changes to AI billing need reconciliation and concurrency thinking, not only route behavior.

High-value tests cover quality scopes, panel behavior, agent actions, and tab completion, but direct OpenRouter/SSE, timeout, cost fallback, malformed structured output, and debit-failure integration coverage is limited.

## Stripe billing

Stripe supports Personal entitlements, Company subscriptions/lifetime purchases, seats, and credit top-ups.

Typical plan flow:

1. An authenticated checkout route resolves a stable Stripe lookup key.
2. Checkout metadata binds the Supabase user, plan, cadence, and mode.
3. Stripe redirects the user, but redirects are not authoritative.
4. `app/api/stripe/webhook/route.ts` verifies the raw-body signature.
5. The webhook provisions or updates entitlement/company/billing/membership rows.
6. Subscription lifecycle and full refunds revoke or freeze access; company data is retained.

Credit top-ups use PaymentIntents and are credited only after success, keyed idempotently by PaymentIntent ID. Company seat purchase has a transactional RPC for the high-risk capacity/billing update.

Operational caveats:

- With no `STRIPE_WEBHOOK_SECRET`, the webhook returns success without processing. Deployment monitoring must catch configuration mistakes.
- Checkout Session creation is not protected by a server idempotency key, so concurrent clients may create multiple valid payment pages.
- Initial company credit grant is best-effort after provisioning and may need recovery.
- Webhook route/provisioning behavior has less automated coverage than refund classification and permission logic.

Primary sources are `lib/stripe.ts`, `lib/company-billing.ts`, `app/api/stripe/**`, `app/api/app/credits/**`, and billing migrations.

## GitHub version control

GitHub synchronization stores a visible `creed.md` in a configured repository, branch, and path.

### Authorization

`/api/app/github/authorize` creates a nonce cookie and mode context. The callback verifies the cookie/session, exchanges the code, fetches the GitHub user, and stores an encrypted token. Company configuration is manager-only and stored separately from personal integration data; company operations always use the shared team token.

The classic OAuth scope is `repo read:user`, which is broad. Token refresh retries a failed/expired request once.

### Push

The route accepts Markdown and a local content hash, fetches the current remote file to obtain its SHA, and uses the GitHub Contents API with that SHA for optimistic concurrency. It then stores sync metadata. Because content/hash arrive from the authenticated client, the route does not independently prove they match current server state.

### Pull

Personal pull has preview and apply phases. Preview fetches/parses remote Markdown and computes local/remote/diverged status. Apply accepts the authenticated browser’s preview payload, replaces active sections, clears proposals, retains local archived sections, and gives imported sections proposal-level agent access. Company pull is not implemented.

Preview/apply is not bound to a re-fetched remote SHA, so stale preview data can be applied. This is chiefly a same-user integrity risk but matters when changing the flow.

### Markdown format

`lib/creed-markdown.ts` and `lib/rich-text.ts` preserve supported editor formatting, adjust nested heading levels, and retain accents in comments. Import recognizes top-level level-1/2 section headings and normalizes unsupported markup/whitespace. Maintain `tests/github-roundtrip.test.ts` when changing editor schema or serialization.

## Configuration and deployment

Use `.env.example` only as the documented placeholder inventory; never read or expose `.env.local`. Core configuration categories are:

- site and Supabase connection;
- server-side encryption secret;
- optional OpenRouter, Stripe, GitHub, email/feedback, and branding settings;
- `CREED_CSP_ENFORCE=1` after validating CSP report-only behavior.

`next.config.ts` permits only the known Supabase, OpenRouter, GitHub, and Stripe network origins in CSP. CSP is report-only by default and still permits inline scripts/styles for framework requirements. User pages are no-store; static brand assets use long immutable caching.
