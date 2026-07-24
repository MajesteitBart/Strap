# Platform integrations

## Supabase

Supabase provides authentication, Postgres, RLS, realtime, retention scheduling, and the `supabase_vault` extension used by `/vault`. Session clients operate under RLS. OAuth, Company writes, and secret-bearing integrations often use the admin client, which bypasses RLS and therefore requires explicit application authorization first.

The ordered SQL files in `supabase/migrations/` are canonical schema history. Their Creed- and Stripe-named objects are not renamed during the Strap rebrand.

See [Schema and security](../data/schema-and-security.md) for authorization and plaintext boundaries.

## OpenRouter: Included AI and BYOK

AI routes under `app/api/app/ai/**` resolve the active Strap and permission, choose a server-controlled model, build bounded context, call `lib/ai/openrouter.ts`, validate the response, and record usage.

Two credential modes exist:

- **Included:** uses `OPENROUTER_PLATFORM_KEY`. The historical database value is `ai_mode = 'credits'`, but no credits are sold or debited.
- **BYOK:** decrypts a valid Personal or Company OpenRouter key. If the deployment has no platform key, users must configure BYOK.

`lib/ai/credits.ts` retains its historical filename but now enforces operational limits rather than billing:

- process-local burst limit: 20 included-AI requests per user per 60 seconds;
- trailing-24-hour estimated-cost limit: `$0.50` per user by default;
- deployment override: `INCLUDED_AI_DAILY_LIMIT_USD`.

Usage remains in `creed_ai_usage` for visibility and quota calculation. There is no debit RPC, prepaid balance, checkout, or runtime payment flow. Profile content sent to OpenRouter crosses an external privacy boundary; BYOK values are exposed client-side only as safe status/last-four metadata.

## GitHub version control

New Personal and Company configurations default to visible `strap.md`; migration `20260724120000_strap_profile_defaults.sql` updates database defaults. `lib/profile-file.ts` controls compatibility:

- blank or configured `strap.md` tries `strap.md`, then legacy `creed.md`;
- any other stored path is exact;
- push refuses to create a competing `strap.md` when a read resolved legacy `creed.md`.

### Authorization and storage

`/api/app/github/authorize` creates a nonce cookie and mode context. The callback verifies cookie/session, exchanges the code, fetches the GitHub user, and stores an encrypted token. Company configuration is manager-only and uses the Company token. The classic `repo read:user` scope is broad; token refresh retries once when appropriate.

### Push/pull

Push fetches the remote SHA and uses GitHub Contents optimistic concurrency. The default message is `Update Strap`. Personal pull has preview and apply phases; apply replaces active sections, clears proposals, retains archived sections not reintroduced, and gives imported sections proposal-level access. Company pull is not implemented.

Preview/apply is not bound to a freshly fetched remote SHA, so stale preview data can be applied. Maintain `tests/github-roundtrip.test.ts` and profile-path tests when changing the flow.

### Format

`lib/strap-markdown.ts` and `lib/rich-text.ts` preserve supported formatting, adjust headings, and retain the compatibility comment `<!-- creed:accent=... -->`. `lib/creed-markdown.ts` is only a deprecated compatibility re-export shim; format identifiers stay unchanged even though customer-facing defaults are Strap.

## Pricing and removed Stripe runtime

`lib/marketing/pricing.ts` is the public pricing source:

- Open: `$0 forever`, self-hosted, BYOK;
- Personal: `$0 forever`, hosted, included AI or BYOK;
- Company: `$0 forever`, hosted, included AI or Company BYOK, unlimited members.

Stripe has been removed from active dependencies, `.env.example`, and runtime routes. Company creation is direct and idempotent through `POST /api/app/company`; invites are not purchased seats.

Historical migrations and rows such as `creed_entitlements`, `creed_company_billing`, Stripe columns, and seat-purchase records remain for forward-only history and limited compatibility state. They do not describe current paid plans. `lib/welcome.ts` still uses historical records for one-time welcome dismissal, not billing.

## Configuration and deployment

Use `.env.example` only as a placeholder inventory; never read or expose `.env.local`. New deployments should use `STRAP_ENCRYPTION_SECRET` for token and payload encryption and `STRAP_AGENT_MODEL` to override the Included AI agent model. Runtime checks the corresponding `CREED_ENCRYPTION_SECRET` and `CREED_AGENT_MODEL` names only as lower-priority compatibility fallbacks; when both forms are set, the Strap value wins. Other configuration covers site/Supabase values and optional OpenRouter, GitHub, email, and branding values. `CREED_CSP_ENFORCE=1` remains an internal compatibility-named switch that enables CSP enforcement after report-only validation.

`next.config.ts` constrains known network origins. User pages are no-store and static assets use long caching. Root `tsconfig.json` excludes both independent CLI packages; verify `packages/strap` with its own scripts.

The Git remote and current repository/package metadata use [MajesteitBart/Strap](https://github.com/MajesteitBart/Strap). Retain `MajesteitBart/Creed` only when documenting explicit historical evidence.
