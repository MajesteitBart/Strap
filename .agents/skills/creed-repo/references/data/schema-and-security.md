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

Recent commits corrected pgcrypto schema resolution in the credential migration and restored table grants expected by the hosted Supabase Data API. Those grants rely on RLS; enabling a new table without appropriate RLS is therefore especially dangerous.

## Core records

| Concept | Representative storage |
|---|---|
| Creed/workspace | `creeds` with `personal` or `company` type and owner |
| Membership | `creed_members` with owner/admin/member role |
| Content | `creed_sections`, ordered and revisioned per Creed |
| Review | `creed_proposals`, including structural drafts and base revision |
| History | `creed_activity`, company section version records, audit events |
| Agent access | legacy token tables, OAuth clients/codes/tokens/grants, MCP usage/read events |
| Monetization | entitlements, company billing/seats, pooled/personal credits and transactions |
| Integrations | personal/company GitHub config and encrypted credentials, AI settings/BYOK |

Read the latest migration touching a table rather than relying only on its creation migration. Company migrations intentionally shipped additive foundations first, then re-keyed live content in coordinated steps.

## Authorization layers

### Session and RLS

Browser requests authenticate with Supabase `auth.getUser()`. Session clients are subject to RLS. Membership-aware helper functions such as `creed_role()` use carefully constrained `SECURITY DEFINER` logic to avoid recursive policies. Function search paths, execution grants, and role exposure are security properties, not boilerplate.

Personal content can generally be written through owner-scoped session policies. Company content is more restrictive: application routes authorize the caller, then the service role performs the write.

### Service role

The admin client bypasses RLS. Before every admin operation, code must establish the user identity and then check the relevant entitlement, membership, role, section permission, billing state, or webhook signature. Never move an admin call earlier than its checks or treat a client-provided Creed ID as authorization.

Company P0 hardening migrations add deny-by-default policies, service-only integration tables, restricted RPC grants, and transactional operations for selected billing/ownership paths. `tests/company-p0-migrations.test.ts` asserts important SQL properties textually; a local database reset is still required for executable validation.

### Agent credentials

Agent bearer tokens are separate from browser sessions. Lookup uses SHA-256 token hashes; recoverable values use AES-256-GCM encryption derived from `CREED_ENCRYPTION_SECRET`. OAuth uses PKCE, short-lived single-use codes, rotating refresh tokens, and per-Creed grants. See [Agents and OAuth](../integrations/agents-and-oauth.md).

## Privacy and external boundaries

Creed content is sensitive user/company context. It leaves the application only through explicit product features such as:

- OpenRouter inference;
- GitHub `creed.md` synchronization;
- MCP or direct HTTP responses to an authorized agent.

Hidden sections must be removed before payload construction, not merely hidden in UI. Profile content sent to an agent is explicitly labeled as data, never instructions, to reduce prompt-injection ambiguity.

Do not read, log, document, or commit `.env.local`, raw tokens, API keys, refresh tokens, or encryption secrets. `.env.example` is safe only as a placeholder map.

## Audit, retention, and observability

Sensitive server actions should emit `creed_audit_events` where appropriate. Server logs use `lib/observability.ts`, not `console.log`, and include request IDs propagated by `proxy.ts`. Activity records describe content changes; administrative events belong in the audit trail rather than the content activity sidebar.

Retention migrations schedule cleanup for selected activity/usage records. When adding a new event stream, decide whether it is product history, security audit, billing evidence, or transient telemetry; each has different retention and access needs.

## Migration checklist

1. Add a new timestamped migration; never rewrite applied production history casually.
2. Make reruns safe where practical with guarded create/drop statements.
3. Enable RLS and define policies before exposing tables through Data API grants.
4. Set `search_path` on security-definer functions and minimize execute grants.
5. Keep TypeScript permission logic and SQL helpers/policies equivalent.
6. Consider existing personal rows, company rows, backfills, nullability, and uniqueness.
7. Test transactional/idempotent behavior for webhook and billing RPCs.
8. Run `npx supabase db reset` locally and `npm test`.
9. Confirm the configured project reference before any remote push.
10. Review generated advisor/security warnings rather than silencing them without explanation.

Security issues should follow `SECURITY.md`, not a public issue. The deployed CSP is report-only unless `CREED_CSP_ENFORCE=1`; it also permits inline framework styles/scripts, so it is defense-in-depth rather than a complete injection boundary.
