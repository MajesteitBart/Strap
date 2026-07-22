---
name: Headless Access and API Key Vault
slug: headless-access-secret-vault
owner: MajesteitBart
created: 2026-07-22T05:39:38Z
updated: 2026-07-22T05:39:38Z
---

# Decisions: Headless Access and API Key Vault

## Active Decisions

- D-001: Deliver both features in the single `headless-access-secret-vault` Delano project with three workstreams.
- D-002: Support both opaque Creed API keys and the standards-based OAuth device authorization grant for headless access.
- D-003: Bind new credentials to exactly one Creed and revalidate current membership and section permissions on each MCP request.
- D-004: Store API key and device-code hashes, never recoverable credential plaintext.
- D-005: Keep stored external secret payloads exclusively in Supabase Vault; expose them only through restricted service-role database functions and explicit no-store app responses.
- D-006: Limit company Vault access to owners/admins for the initial release; automatic secret injection and per-secret sharing are out of scope.
- D-007: Remove the repo-local next-forge skill and current-state references because the owner explicitly said it is not needed.
- D-008: Require independent Claude Fable review before decomposing the plan into executable tasks.
- D-009: Allow personal-Creed fallback only for legacy OAuth tokens with no grant rows. Explicit credentials that lose access resolve to empty state.
- D-010: Enforce access modes by stripping mutation tokens before policy construction and dispatch, not only by changing advertised permissions.
- D-011: Omit `verification_uri_complete` so user codes never appear in URLs.
- D-012: Require Vault reveal audit persistence before returning plaintext to the caller.

## Superseded Decisions

- The bootstrap-time decision to install next-forge is superseded by explicit owner direction on 2026-07-22.

## Open Decision Questions

- None. Remaining technical risks have conservative implementation defaults and verification gates.
