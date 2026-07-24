# Schema and security

## Schema evolution and naming

`supabase/migrations/` is forward-only history. The schema evolved from Personal profiles and static agent tokens through GitHub/AI/audit, hashed credentials, OAuth/MCP, Company workspaces, permissions/versioning, and finally scoped headless access plus Supabase Vault.

Stable database identifiers remain Creed-named: `creeds`, `creed_members`, `creed_sections`, `creed_proposals`, `creed_headless_access_keys`, `creed_vault_items`, `creed_id`, and `creed_vault_*` RPCs. Historical migrations also retain Stripe-era tables/columns. Strap branding does not authorize renaming these contracts.

`20260724120000_strap_profile_defaults.sql` changes customer-facing defaults only: new Personal/Company GitHub paths become `strap.md`, untouched generated `Your Creed` names become `Your Strap`, and future Vault descriptions say `Managed by Strap`. The RPC/table names and internal Vault secret prefix remain Creed-named.

## Representative records

| Concept | Storage |
|---|---|
| Strap/workspace | `creeds` (`personal` or `company`) |
| Membership | `creed_members` with owner/admin/member role |
| Content/review/history | `creed_sections`, `creed_proposals`, `creed_activity`, section versions, audit events |
| Agent access | legacy tokens, OAuth clients/codes/tokens/grants, headless keys, device authorizations, MCP events |
| Secret metadata | `creed_vault_items`; payload referenced by `vault_secret_id` |
| Integration/history | Personal/Company GitHub and BYOK records; retained entitlement/billing/seat/credit history |

Read the latest migration touching a table, not only its creation migration.

## Authorization layers

### Session and service role

Browser APIs authenticate with Supabase `auth.getUser()`. Session clients operate under RLS. Company mutation routes often authorize membership/role/section policy before a service-role write.

The admin client bypasses RLS. User identity plus entitlement/membership/role/item ownership checks must precede every admin operation. Never treat a client-supplied `creed_id`/`strapId` as authorization.

### Agent credentials and explicit grants

OAuth access/refresh tokens and legacy agent tokens use SHA-256 hashes for lookup; recoverable OAuth values use AES-256-GCM through `lib/secret-crypto.ts`. Device/user codes and headless API keys are hash-only.

New headless keys use `strap_key_`; existing `creed_key_` values remain recognized compatibility credentials. Each key is shown in plaintext only in the creation response, while storage retains its digest and display prefix. It binds one creator, one Personal or Company Strap, one mode (`read-only`, `proposal-only`, or `direct`), and optional expiry. MCP rechecks revocation, expiry, creator membership, grant, and live section permission.

Modern OAuth grants likewise identify exactly one Strap. Browser consent selects Personal/Company and currently records a direct ceiling; device consent explicitly selects the maximum mode. Mode is always a ceiling. Missing/inaccessible modern grants fail narrow; only positively identified legacy OAuth tokens without explicit grants may use the historical Personal fallback.

## Supabase Vault plaintext boundary

`/vault` manages Strap-scoped external secrets:

- `public.creed_vault_items` stores metadata and `vault_secret_id`, not payload plaintext.
- Lists select metadata only.
- Service-role-only, security-definer `creed_vault_*` RPCs create, decrypt, update, and delete Vault payloads; execution is revoked from `public`, `anon`, and `authenticated`.
- Personal access requires live membership. Company access requires owner/admin; members receive `403`.
- Item mutation/reveal authorizes using the item’s database-loaded `creed_id`, not a caller-selected profile.

Supabase Vault is an at-rest boundary, not a claim that plaintext never reaches application code. Plaintext exists transiently in:

1. create/rotate browser form and request body;
2. Node route/RPC arguments;
3. service-role RPC execution and Vault decrypted view;
4. an explicit reveal RPC result, app-server memory, no-store JSON response, and temporary browser state.

Reveal is fail-closed: `recordRequiredAuditEvent` must persist `vault.secret_revealed` before plaintext is returned, or the route returns `503`. Decryption and `last_accessed_at` update have already occurred inside the RPC at that point, but plaintext is withheld from the HTTP response. The UI clears revealed state after 30 seconds. Ordinary lists, logs, and agent context expose metadata or references only.

`lib/secret-crypto.ts` is separate from Supabase Vault. It encrypts recoverable OAuth, GitHub, OpenRouter, and legacy application credentials.

## Free product and historical billing schema

There is no active Stripe dependency, checkout/webhook runtime, paid-plan gate, or paid Company-seat flow. Open, Personal, and Company are `$0 forever`. Historical `stripe_*`, entitlement, billing, seat-purchase, and credit-ledger records remain because migrations are forward-only and some non-payment state still uses older tables. Preserve them as history; do not infer live billing from schema names.

## Privacy, audit, and migration checklist

Hidden sections must be removed before payload construction. Profile content sent to agents is labeled as data, not instructions. Sensitive actions should use audit events; reveal uniquely requires durable audit success.

For migrations: add a timestamped file; preserve applied history; enable RLS before grants; constrain security-definer `search_path` and execute grants; keep TypeScript and SQL permission twins aligned; consider existing Personal/Company/history rows; run `npx supabase db reset` and `npm test`; and confirm the project reference before remote pushes.
