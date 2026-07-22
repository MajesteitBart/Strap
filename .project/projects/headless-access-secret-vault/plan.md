---
name: Headless Access and API Key Vault
status: done
lead: MajesteitBart
created: 2026-07-22T05:39:38Z
updated: 2026-07-22T06:39:46Z
linear_project_id:
risk_level: high
spec_status_at_plan_time: planned
operating_mode: multi-stream
---

# Delivery Plan: Headless Access and API Key Vault

## What Changed After Probe

The original feature request was separated into credential issuance, encrypted secret storage, and product/release integration while remaining one Delano project. The probe selected standards-based OAuth device authorization rather than a proprietary link-token protocol, kept normal OAuth tokens as the post-approval credential, and made Supabase Vault the only plaintext-at-rest boundary for stored external API keys.

## Technical Context

- Next.js App Router route handlers use session auth through `requireApiAuth()` for app APIs.
- MCP currently accepts hashed OAuth bearer tokens and derives accessible Creeds from `oauth_token_creeds`.
- Supabase service-role clients are already used for server-only privileged operations.
- Creed membership, role, frozen state, and section-level permissions remain the source of truth.
- Audit logging is best-effort and must contain identifiers and operation metadata only.

## Architecture Decisions

- Normalize MCP bearer authentication into a credential grant containing user id, credential id/type, one or more explicitly granted Creed ids, whether those grants are explicit, and an optional maximum access mode. Only legacy OAuth tokens with no grant rows may use personal fallback; inaccessible explicit grants always produce empty state.
- API keys are opaque, prefixed, high-entropy values stored only as hashes; the full value is returned once on creation.
- Device authorization rows store only hashes for device and user codes. Approval records a single Creed and token issuance consumes the authorization atomically. Attempt counts, poll timestamps, and effective intervals are durable database state.
- Vault values cross the application boundary only through service-role-only `SECURITY DEFINER` functions with an empty search path and fully qualified object names. Each mutation performs the Vault operation and metadata write in one transaction. Application tables contain metadata and a Vault secret UUID.
- Personal owners and company owners/admins can use the vault. Company members cannot list or reveal vault metadata in this release.

## Policy and Contract Checks

- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map

- `spec.md`: Approved product and security behavior.
- `plan.md`: Delivery sequence and verification gates.
- `decisions.md`: Durable design and scope decisions.
- `workstreams/WS-A-headless-authentication.md`: API keys, device grant, and MCP integration.
- `workstreams/WS-B-supabase-api-key-vault.md`: Vault schema, APIs, and authorization.
- `workstreams/WS-C-product-integration-and-release.md`: UI, docs, validation, and PR evidence.
- `tasks/`: Atomic executable tasks created after independent review.

## Complexity Exceptions

- Device authorization and Vault are security-sensitive enough to require separate focused server modules and database functions even though a smaller file count would be possible.
- Workstreams share one migration to preserve foreign-key and grant ordering; schema touchpoints will be serialized through task dependencies.

## Probe-Driven Architecture Changes

- Prefer a normalized MCP credential resolver over teaching all protocol handlers about each credential type.
- Make the existing personal-Creed fallback explicitly legacy-OAuth-only and preserve empty state when explicit grants become inaccessible.
- Strip `writeToken` and `directEditToken` according to the credential mode before building write policy or dispatching tools on both personal and company paths.
- Use database-backed device poll timing and consumption to support horizontally scaled deployments.
- Do not grant the app's authenticated database role direct access to Vault functions or decrypted views.
- Omit optional `verification_uri_complete`; the human-readable user code is never placed in a URL.
- Fail Vault reveal closed unless a required metadata-only audit record is durably written before the response.
- Treat automatic vault-to-agent secret delivery as a future project because it introduces a materially different authorization boundary.

## Workstream Design

- WS-A, Headless Authentication: database records and helpers for headless keys and device codes, authenticated management APIs, OAuth device endpoints, MCP integration, metadata, and tests.
- WS-B, Supabase API Key Vault: Vault migration and restricted functions, server authorization layer, app API routes, audit events, and tests.
- WS-C, Product Integration and Release: headless Connections UI, Vault screen/navigation, next-forge cleanup, documentation, full quality gates, and PR handoff.

## Milestone Strategy

1. Review gate: Claude Fable reviews the Spec and Plan; blockers are incorporated.
2. Data gate: migration and server modules land with focused tests.
3. Protocol gate: API-key MCP and device authorization pass happy-path and denial tests without OAuth regressions.
4. Product gate: users can manage credentials and vault items through the UI.
5. Release gate: local migration reset, test, typecheck, lint, build, Delano validation, and diff review complete.

## Rollout Strategy

- Ship additive schema and endpoints; existing clients remain unchanged.
- Advertise device authorization only when endpoints are deployed in the same release.
- New navigation and Connections surfaces become available without migrating existing credentials.
- Revocation is immediate at request authentication; no token caches are introduced.

## Test Strategy

- Unit tests for key parsing/hashing, user-code normalization/entropy, invalid-attempt invalidation, poll timing/slow-down, access-mode token stripping/clamping, bearer-digest rate-limit identifiers, and input validation.
- Route tests for missing session, unauthorized Creed, role restrictions, one-time key display, revocation, device state transitions, and no-store responses.
- MCP regression tests for OAuth plus new API-key authorization and denied/revoked cases, including revoked company keys and inaccessible explicit OAuth grants yielding empty state instead of personal fallback, and read/propose mutation denial on personal Creeds.
- Migration verification with `npx supabase db reset`, including execute grants and absence of plaintext metadata.
- UI smoke test for create/copy/revoke and vault create/reveal/update/delete with secret-clearing behavior.
- Repository gates: `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, `npm run build`, and `delano validate`.

## Rollback Strategy

- UI and discovery advertisement can be reverted independently while additive database objects remain inert.
- Revoke all headless keys and deny pending device codes if authentication behavior must be disabled.
- Do not drop Vault data during application rollback. A later audited migration may remove objects only after secret export/deletion is explicitly approved.

## Remaining Delivery Risks

- Vault extension/function behavior can differ between local and hosted Supabase; both clean-local schema verification and generated API behavior need evidence.
- Device-code brute force and polling amplification require bounded attempts, expiry, interval enforcement, and existing rate-limit integration.
- UI reveal state must be short-lived and deliberately cleared to reduce shoulder-surfing and browser-memory exposure.
