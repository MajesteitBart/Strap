---
name: Legacy billing offboarding
slug: legacy-billing-offboarding
owner: MajesteitBart
status: complete
created: 2026-09-13T09:25:18Z
updated: 2026-09-13T16:38:13Z
outcome: Merge PR 5 with owner-authorized legacy cancellation and atomic Company provisioning while preserving Strap compatibility and migration history.
uncertainty: low
probe_required: false
probe_status: skipped
probe_decision_rationale: Existing PR and implementation establish the scope; current user authorizes repair and merge.
operating_mode: feature
---

# Spec: Legacy billing offboarding

## Executive Summary
Finish the existing PR 5 against current Strap. Preserve a way for legacy
subscribers to stop renewal and make Company provisioning transactional.

## Problem and Users
Users with historical paid subscriptions still need cancellation after billing
removal. Company owners need retries to create one complete workspace and membership.

## Outcome and Success Metrics
- Only the signed-in owner can inspect or cancel their legacy subscription.
- Cancellation is confirmed against Stripe and handles retry and network failures.
- Concurrent Company provisioning returns one id and persists owner membership atomically.
- Root and local database checks pass before review and merge.

## User Stories
- US-001: As a legacy subscriber, I can stop renewal from Settings without losing my Strap.
- US-002: As a Company owner, retries cannot leave a partially created workspace.

## Acceptance Scenarios
- AC-001: An unrelated user or Company member cannot cancel the owner's subscription.
- AC-002: Repeated cancellation and failed requests leave a recoverable interface.
- AC-003: Concurrent provisioning creates one workspace with its owner membership.

## Scope
### In Scope
PR 5, authenticated cancellation route, Settings notice, Stripe transport, Company
provisioning RPC, forward migration, regression tests and evidence.
### Out of Scope
Checkout, paid plans, Stripe SDK, real subscription test cancellations, destructive
data cleanup, visual redesign and unrelated dependency upgrades.

## Functional Requirements
Use session authentication, live Company ownership, stored subscription ids,
uncached responses and a service-role-only database function.

## Non-Functional Requirements
Preserve migration history, strict types, responsive UI, audit metadata and secrets.

## Assumptions
- Project scope and ownership remain accurate as execution starts.

## Needs Clarification
- None recorded at creation.

## Hypotheses and Unknowns

## Touchpoints to Exercise

## Probe Findings

## Footguns Discovered

## Remaining Unknowns
Availability of the production legacy Stripe key and final external review.

## Dependencies
Current Strap main, Supabase, and a legacy Stripe key only for historical subscriptions.

## Approval Notes
2026-09-13: User authorized finishing outstanding branches, commits, PR review and merge.
