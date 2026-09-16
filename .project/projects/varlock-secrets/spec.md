---
name: Varlock secrets provider
slug: varlock-secrets
owner: MajesteitBart
status: complete
created: 2026-09-16T01:51:56Z
updated: 2026-09-16T02:21:03Z
outcome: Varlock resolves explicitly authorized Strap Vault items at runtime through a revocable scoped key.
uncertainty: medium
probe_required: false
probe_status: skipped
probe_decision_rationale: Official Varlock plugin API and existing Vault authorization inspected before implementation.
operating_mode: feature
---

# Spec: Varlock secrets provider

## Outcome and Success Metrics
Load explicitly selected Strap Vault items with `strap()` in a Varlock schema, using a revocable profile-scoped key. Plaintext is limited to the authorized reveal response and consuming runtime.

## User Stories
- US-001: An operator selects the secrets an application may read and uses safe references in source-controlled configuration.
- US-002: A Company admin delegates selected items while live role changes and revocation remain effective.

## Acceptance Scenarios
- AC-001: Existing keys and OAuth credentials cannot reveal secrets. New grants select immutable IDs within the key's profile.
- AC-002: Reveal checks key hash, expiry, revocation, membership, item grant, item profile, current Vault role, and required audit. Denials expose no plaintext.
- AC-003: Real Varlock loads the bundle, resolves named instances, marks outputs sensitive, and injects values while excluding the bootstrap key.
- AC-004: Responses are no-store; unsafe origins and redirects are rejected; diagnostics omit upstream response bodies and credential values.
- AC-005: Root checks, focused authorization tests, package checks, local migration reset and privilege tests pass with recorded evidence.

## Scope
Includes one independently packaged provider, explicit key item grants, Connections selection, Vault reference copying, dedicated reveal API, setup docs, and CI. Excludes publication, deployment, tracker writes, OAuth secret grants, MCP plaintext tools, wildcard grants, bulk export, caching, and agent-contract changes.

## Constraints
Preserve existing context permissions and Vault owner/admin policy. No new application runtime dependencies. Node 22 and Varlock 1.19 are the package baseline. Apply the additive migration before application rollout.

## Authorization
The user requested feature-branch implementation on 2026-09-16. Routine decisions follow the existing authorization boundaries. No subagents or external publication were requested.

## Evidence Sources
- https://varlock.dev/guides/plugins/
- https://github.com/dmno-dev/varlock/tree/main/packages/plugins/doppler
- Existing key and Vault services, authorization, audit, and migrations.

## Remaining Risks
This worktree has no production configuration. Live verification uses an isolated local instance and synthetic fixtures. Revocation cannot erase values already delivered to a process.

## Executive Summary
Add a portable Varlock provider backed by explicitly granted, audited Strap Vault reveals.

## Problem and Users
Application operators need runtime secret retrieval without copying plaintext into source-controlled configuration.

## Functional Requirements
FR-001: Create bounded per-item key grants. FR-002: Recheck live authorization and audit each reveal. FR-003: Resolve default and named Varlock instances. FR-004: Expose safe reference copying and selection.

## Non-Functional Requirements
No new application runtime dependencies, no plaintext logs or upstream diagnostics, HTTPS outside loopback, no persistent provider cache.

## Assumptions
The target deployment runs the Postgres/Drizzle backend from main and applies migrations before deploying consumers.

## Needs Clarification
None for the bounded local implementation requested.

## Hypotheses and Unknowns
Varlock plugin portability and sensitivity were verified with the actual CLI and relocated bundle.

## Touchpoints to Exercise
Connections, Vault, key creation/revocation, dedicated reveal route, provider load/run, database authorization.

## Probe Findings
Official providers register plugin-lib decorators and resolvers. A CommonJS bundle supports relocation through Varlock.

## Footguns Discovered
Context access must not imply secret access. Wrong-profile UUIDs must fail before decryption. Audit failure must withhold plaintext.

## Remaining Unknowns
No unresolved implementation unknowns; publication and production rollout are outside scope.

## Dependencies
Existing encrypted Vault repositories, scoped credentials, live membership, required audit and Varlock 1.19.

## Approval Notes
User explicitly requested implementation on a feature branch; no separate publication or deployment authorization.
