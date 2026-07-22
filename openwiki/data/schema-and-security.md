# Schema and security

## Schema evolution

`supabase/migrations/` is a forward-only history. The architecture evolved in identifiable phases:

1. Personal sections, proposals, activity, connections, and static agent tokens keyed by user.
2. GitHub configuration, AI settings/usage, audit logging, archives, entitlements, and credits.
3. Hashed/encrypted credentials followed by plaintext purging.
4. OAuth clients, authorization codes, access/refresh tokens, and MCP read events.
5. Introduction of `creeds` and `creed_members`, then re-keying content and credits by `creed_id` for Company support.
6. Company permissions, invites, pooled credits, billing/seats, shared GitHub, versions, proposals, and hardening RPCs.
7. Retention, getting-started state, indexes, and hosted Data API grant corrections.
8. Explicit-grant normalization, headless MCP keys, RFC 8628 device requests, and Creed-scoped secrets backed by Supabase Vault.

Recent commits corrected pgcrypto schema resolution in the credential migration and restored table grants expected by the hosted Supabase Data API. Those grants rely on RLS; enabling a new table without appropriate RLS is therefore especially dangerous.

## Core records

| Concept | Representative storage |
|---|---|
| Creed/workspace | `creeds` with `personal` or `company` type and owner |
| Membership | `creed_members` with owner/admin/member role |
| Content | `creed_sections`, ordered and revisioned per Creed |
| Review | `creed_proposals`, including structural drafts and base revision |
| History | `creed_activity`, company section version records, audit events |
| Agent access | legacy token tables, OAuth clients/codes/tokens/grants, headless access keys, device authorizations, MCP usage/read events |
| Access history | entitlements and retained historical company billing/seat records |
| Integrations | personal/company GitHub config and encrypted credentials, AI settings/BYOK, Vault item metadata |

Read the latest migration touching a table rather than relying only on its creation migration. Company migrations intentionally shipped additive foundations first, then re-keyed live content in coordinated steps.

## Authorization layers

### Session and RLS

Browser requests authenticate with Supabase `auth.getUser()`. Session clients are subject to RLS. Membership-aware helper functions such as `creed_role()` use carefully constrained `SECURITY DEFINER` logic to avoid recursive policies. Function search paths, execution grants, and role exposure are security properties, not boilerplate.

Personal content can generally be written through owner-scoped session policies. Company content is more restrictive: application routes authorize the caller, then the service role performs the write.

### Service role

The admin client bypasses RLS. Before every admin operation, code must establish the user identity and then check the relevant entitlement, membership, role, section permission, or external signature. Never move an admin call earlier than its checks or treat a client-provided Creed ID as authorization.

Company P0 hardening migrations add deny-by-default policies, service-only integration tables, restricted RPC grants, and transactional operations for selected billing/ownership paths. `tests/company-p0-migrations.test.ts` asserts important SQL properties textually; a local database reset is still required for executable validation.

### Agent credentials

Agent bearer tokens are separate from browser sessions. Lookup uses SHA-256 token hashes; recoverable OAuth values use AES-256-GCM encryption derived from `CREED_ENCRYPTION_SECRET`. Headless API keys and device/user codes are hash-only. OAuth supports PKCE authorization codes and device authorization, rotating refresh tokens, and explicit per-Creed grants. `creed_headless_access_keys` and `oauth_device_authorizations` have RLS enabled but expose no table privileges to `anon` or `authenticated`; device verification and polling RPCs are `SECURITY DEFINER`, empty-search-path, and service-role-only. See [Agents and OAuth](../integrations/agents-and-oauth.md).

### Supabase Vault secrets

The signed-in `/vault` surface stores Creed-scoped external API keys. `public.creed_vault_items` contains only metadata and a `vault_secret_id`; plaintext lives in the `supabase_vault` extension. Names are 1–120 characters and unique case-insensitively per Creed, descriptions are at most 500 characters, and the app bounds secret input to 16,384 characters.

Browser operations are session-authenticated but execute through explicit server authorization and the admin client:

- `GET`/`POST /api/app/vault` list metadata or create an item for a supplied Creed;
- `GET`/`PATCH`/`DELETE /api/app/vault/[id]` reveal, update/rotate, or permanently delete the item selected by server-loaded metadata.

Personal access follows membership. Company Vault access requires owner or admin; ordinary members receive `403`. The server loads an item’s own `creed_id` before reveal/update/delete, so a caller cannot authorize an item operation by supplying another Creed ID.

Four service-role-only definer RPCs create, decrypt, update, and delete Vault payloads. Table and function access is revoked from `public`, `anon`, and `authenticated`; this makes the preceding application checks load-bearing because the admin client bypasses RLS and the RPCs do not independently establish end-user identity. Create/update/delete audit events are best-effort. Reveal is fail-closed: `recordRequiredAuditEvent` must persist `vault.secret_revealed` before plaintext is returned, otherwise the route returns `503`. The RPC has already decrypted the value and updated access time at that point.

The UI lists metadata without values, reveals one value only on demand, clears it from component state after 30 seconds, permits metadata edits with optional secret rotation, and deletes both metadata and the underlying Vault row. There is no migration backfill of older application credentials into Vault. Primary sources are `lib/api-key-vault.ts`, `app/api/app/vault/**`, `components/creed/api-key-vault-screen.tsx`, and `20260722120000_headless_access_and_secret_vault.sql`.

## Privacy and external boundaries

Creed content is sensitive user/company context. It leaves the application only through explicit product features such as:

- OpenRouter inference;
- GitHub `creed.md` synchronization;
- MCP or direct HTTP responses to an authorized agent;
- an explicit, audited Vault reveal to an authorized signed-in user.

Hidden sections must be removed before payload construction, not merely hidden in UI. Profile content sent to an agent is explicitly labeled as data, never instructions, to reduce prompt-injection ambiguity.

Do not read, log, document, or commit `.env.local`, raw tokens, API keys, refresh tokens, or encryption secrets. `.env.example` is safe only as a placeholder map.

## Audit, retention, and observability

Sensitive server actions should emit `creed_audit_events` where appropriate. `recordAuditEvent` is best-effort; `recordRequiredAuditEvent` is for operations such as Vault reveal that must fail closed when audit persistence is unavailable. Server logs use `lib/observability.ts`, not `console.log`, and include request IDs propagated by `proxy.ts`. Activity records describe content changes; administrative events belong in the audit trail rather than the content activity sidebar.

Retention migrations schedule cleanup for selected activity/usage records. When adding a new event stream, decide whether it is product history, security audit, billing evidence, or transient telemetry; each has different retention and access needs.

## Migration checklist

1. Add a new timestamped migration; never rewrite applied production history casually.
2. Make reruns safe where practical with guarded create/drop statements.
3. Enable RLS and define policies before exposing tables through Data API grants.
4. Set `search_path` on security-definer functions and minimize execute grants.
5. Keep TypeScript permission logic and SQL helpers/policies equivalent.
6. Consider existing personal rows, company rows, backfills, nullability, and uniqueness.
7. Test transactional/idempotent behavior for security-sensitive RPCs, including device consumption and Vault mutation.
8. Run `npx supabase db reset` locally and `npm test`.
9. Confirm the configured project reference before any remote push.
10. Review generated advisor/security warnings rather than silencing them without explanation.

Security issues should follow `SECURITY.md`, not a public issue. The deployed CSP is report-only unless `CREED_CSP_ENFORCE=1`; it also permits inline framework styles/scripts, so it is defense-in-depth rather than a complete injection boundary.
