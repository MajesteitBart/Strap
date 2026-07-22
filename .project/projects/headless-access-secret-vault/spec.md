---
name: Headless Access and API Key Vault
slug: headless-access-secret-vault
owner: MajesteitBart
status: complete
created: 2026-07-22T05:39:38Z
updated: 2026-07-22T08:54:45Z
outcome: Headless agents can securely connect to one authorized Creed using revocable API keys or device authorization, and signed-in users can manage API-key secrets backed by Supabase Vault without exposing secret values in application tables.
uncertainty: high
probe_required: true
probe_status: completed
probe_decision_rationale: Repository architecture and primary standards were inspected; remaining design risk will be retired by an independent Claude Fable review before implementation.
operating_mode: multi-stream
---

# Spec: Headless Access and API Key Vault

## Executive Summary

Add two related security capabilities to Creed in one delivery project. First, headless clients can authenticate to the existing MCP endpoint with either a revocable, one-time-visible Creed API key or an OAuth 2.0 device authorization flow. Second, signed-in users can store and manage external API keys whose values live only in Supabase Vault while Creed stores searchable metadata and audit events.

## Problem and Users

Interactive OAuth authorization works for desktop MCP clients but is awkward or impossible on remote servers, containers, and headless agents such as Hermes Agent and OpenClaw. Users also lack a protected place inside Creed to keep the third-party API keys those agents require. Copying durable credentials into environment files creates rotation, recovery, and accidental-disclosure risk.

Primary users are an individual Creed owner configuring a headless agent and a company owner or admin managing a company Creed. Company members are intentionally excluded from vault access in this first release.

## Outcome and Success Metrics

- A user can create a Creed-scoped API key, see its full value once, use it as the MCP bearer token, list its metadata, and revoke it.
- A headless OAuth client can complete the device authorization grant and receive the same scoped OAuth tokens used by the existing authorization-code flow.
- MCP authorization never grants access beyond the Creed selected during key creation or device approval, and current membership and section permissions are revalidated on every request.
- A personal owner or company owner/admin can create, list, reveal, update, and delete API-key secrets through authenticated app routes.
- Secret payloads are stored only by Supabase Vault, never in application metadata tables, audit metadata, logs, URLs, or list responses.
- TypeScript, lint, production build, focused automated tests, Delano validation, and a local migration reset pass before handoff.

## User Stories

- US-001: As a headless-agent operator, I want a revocable Creed API key so that a server can connect without an interactive browser.
- US-002: As a headless-agent operator, I want to approve a short device code on another device so that a capable client can obtain standard OAuth tokens.
- US-003: As a Creed owner, I want every headless credential limited to one Creed and a coarse access mode so that credential compromise has bounded impact.
- US-004: As a vault operator, I want secret values encrypted by Supabase Vault and revealed only on demand so that Creed does not persist plaintext secrets in its own tables.
- US-005: As a vault operator, I want metadata, rotation, revocation, and audit history so that API keys remain manageable over time.

## Acceptance Scenarios

- AC-001: Given an authenticated user and a Creed they can access, when they create a headless key, then the response contains the complete key exactly once and later list responses contain only its name, prefix, scope, timestamps, and status.
- AC-002: Given a valid unrevoked key, when an MCP request is made, then the request resolves only the bound Creed, rechecks membership, applies the lesser of key access mode and current section permission, and strips write/direct tokens that exceed the key mode before tool dispatch.
- AC-003: Given a revoked, expired, malformed, or unauthorized key, when it is used, then MCP returns the existing unauthorized response and no Creed data.
- AC-004: Given a registered OAuth client, when it requests device authorization, then Creed returns a high-entropy device code, human-readable user code, verification URI, expiry, and polling interval without exposing stored hashes.
- AC-005: Given a pending device request, when a signed-in user approves one accessible Creed and the client polls within policy, then the code is atomically consumed once and a normal Creed-scoped OAuth token pair is issued.
- AC-006: Given a pending, denied, expired, or too-frequently-polled device request, when the client polls, then the RFC-defined error is returned without issuing tokens.
- AC-007: Given an authorized vault operator, when they create a secret, then the payload is written through a service-role-only RPC to `vault.secrets` and only metadata plus the Vault UUID is written to a Creed table.
- AC-008: Given a vault list request, audit event, server log, or error, then the secret value is absent.
- AC-009: Given a company Creed member who is not owner/admin, when they call any vault endpoint, then access is denied.
- AC-010: Given any `/api/app/*` route added by this project, when called without a valid session, then `requireApiAuth()` rejects it.

## Scope

### In Scope

- Creed-scoped MCP API keys with one-time display, hashed storage, optional expiry, access mode, use timestamp, and revocation.
- OAuth device authorization endpoints, approval UI, token exchange, discovery metadata, expiry, denial, atomic consumption, and polling controls.
- Supabase Vault extension setup plus service-role-only database functions for secret CRUD.
- Creed-owned secret metadata, authorization, app APIs, audit events, and a signed-in vault UI.
- Connections UI and setup guidance for headless clients.
- Removal of the unneeded repo-local `next-forge` skill and correction of current-state bootstrap/context documentation.

### Out of Scope

- Automatically injecting vault values into agents, tools, or runtime environments.
- Per-secret sharing policies, collections, service accounts, organization-to-organization sharing, or emergency access.
- Import from Bitwarden, 1Password, environment files, or cloud secret managers.
- OAuth dynamic client registration changes or replacing the existing authorization-code flow.
- Changes to static `/api/creed/*` capability tokens or the universal agent contract.

## Functional Requirements

- FR-001: Store only SHA-256 digests for headless API keys and device/user codes; use cryptographically secure random input and constant-time digest comparison where applicable.
- FR-002: Bind each API key and each completed device authorization to exactly one Creed.
- FR-003: Support `read`, `propose`, and `direct` key modes, clamped by current section-level permissions on both personal and company paths. A read credential resolves with empty write/direct tokens; a propose credential resolves with an empty direct token. Tool dispatch must enforce the resulting tokens rather than relying on advertised policy alone.
- FR-004: Revalidate user membership for every key-authenticated MCP request and reject frozen/deleted/inaccessible Creeds according to existing product policy.
- FR-005: Implement the OAuth device authorization grant fields and errors defined by RFC 8628, including `authorization_pending`, `slow_down`, `access_denied`, and `expired_token`.
- FR-006: Make device approval explicit, identify the requesting client, and require an accessible Creed selection.
- FR-007: Never reveal a headless Creed API key after its one-time creation response. Vault secret values are separately revealable only through an explicit authenticated action with `Cache-Control: no-store`.
- FR-008: Restrict personal vault CRUD to the owner and company vault CRUD to company owners/admins.
- FR-009: Record metadata-only audit events for key lifecycle, device approval/denial, and vault create/reveal/update/delete.
- FR-010: Keep all new secrets and authorization records behind RLS and service-role access; database functions must revoke execution from public, anon, and authenticated roles.
- FR-011: A normalized MCP credential grant must carry credential type and explicit Creed ids. Personal-Creed fallback is permitted only for legacy OAuth credentials with no grant rows, never for API keys, device-issued OAuth tokens, or OAuth tokens whose explicit grants are no longer accessible.
- FR-012: Device verification enforces an eight-character user code drawn from an alphabet of at least 20 symbols, no more than 10 invalid attempts per authorization, per-IP verification limits, expiry, and RFC `slow_down` behavior that increases the polling interval by five seconds. Durable attempt and poll state lives in Postgres.
- FR-013: MCP rate-limit identifiers use a bearer digest, not the raw bearer value.
- FR-014: Vault reveal must fail closed if its required metadata-only audit event cannot be persisted; other lifecycle audit events remain best-effort unless implemented atomically by the database function.

## Non-Functional Requirements

- No new runtime dependencies.
- All input is length-bounded and strictly narrowed; TypeScript remains strict with no `any`.
- Sensitive responses use `Cache-Control: no-store`; secrets are never logged.
- Existing OAuth and static-token clients remain backward compatible.
- Database migration is forward-only and idempotent where practical.
- The implementation remains discoverable through focused server modules instead of expanding existing god files unnecessarily.

## Assumptions

- Supabase Vault is available on the configured Supabase Postgres instance.
- Existing OAuth clients may use the device grant once discovery advertises it; client registration itself remains unchanged.
- The existing Creed membership and section-permission models are authoritative.
- Vault access is intentionally conservative for company Creeds in the initial release.

## Needs Clarification

- None. Conservative defaults are specified for unresolved sharing and authorization choices.

## Hypotheses and Unknowns

- The Supabase-generated API can invoke restricted `SECURITY DEFINER` functions containing Vault operations through the service-role client.
- Device polling can be made single-use and race-safe with an atomic database update/RPC rather than process-local state.
- The existing MCP state resolver can accept a normalized credential grant without changing protocol behavior after its legacy fallback is made credential-type-aware.

## Touchpoints to Exercise

- `app/mcp/route.ts`, `app/token/route.ts`, OAuth discovery, device endpoints, and consent UI.
- New `/api/app/headless-access*` and `/api/app/vault*` routes.
- New Vault page and Connections headless-access card.
- Supabase migration from a clean local database.
- Existing authorization-code and refresh-token regression tests.

## Probe Findings

- Existing OAuth access and refresh tokens are hashed and already carry explicit Creed grants, which can remain the canonical issued-token format.
- MCP currently resolves authorization directly from an OAuth token id; a normalized credential grant is the smallest safe integration seam.
- Supabase Vault exposes `vault.create_secret`, `vault.update_secret`, and `vault.decrypted_secrets`; access to decrypted values must be isolated behind restricted server-side functions.
- RFC 8628 supplies the interoperable device request, polling, expiry, and error contract needed by headless clients.

## Footguns Discovered

- Falling back from a missing Creed grant could accidentally widen new credentials to the personal Creed; fallback must remain legacy-OAuth-only.
- Process-local polling throttles are insufficient across server instances.
- Reading `vault.decrypted_secrets` from a general-purpose Supabase client would make plaintext too broadly reachable.
- Revealed secrets can leak through caches, error objects, audit metadata, or retained client state even when database storage is correct.

## Remaining Unknowns

- Local Supabase/Docker availability for migration verification; failure will be captured as explicit evidence rather than bypassed.
- Supabase Vault migration-role ownership and function grants must be confirmed on both local and hosted-compatible schemas.

## Dependencies

- Existing Supabase auth, service-role configuration, Creed membership, section permissions, OAuth server, MCP endpoint, and audit log.
- Independent Claude Fable review of this Spec and Delivery Plan before task execution.

## Approval Notes

- 2026-07-22T05:53:25Z: Spec and Plan approved after Claude Fable review; executable tasks and acceptance gates are recorded.

- User requested one Delano project, explicitly removed next-forge from scope, requested Claude Fable review, and authorized implementation plus a feature-branch PR to `main`.
