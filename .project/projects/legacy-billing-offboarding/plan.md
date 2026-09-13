---
name: Legacy billing offboarding
status: done
lead: Codex
created: 2026-09-13T09:25:18Z
updated: 2026-09-13T16:38:13Z
linear_project_id:
risk_level: high
spec_status_at_plan_time: planned
operating_mode: feature
---

# Delivery Plan: Legacy billing offboarding

## What Changed After Probe

## Technical Context
Current main renamed product paths. PR 5 must retain those names while adding
authenticated offboarding and transactional provisioning.

## Architecture Decisions
- Keep subscription ids server-side and load them through owner-constrained queries.
- Read live Stripe status because the removed webhook no longer refreshes billing rows.
- Use a bounded Stripe HTTP helper with no new dependency or checkout endpoint.
- Preserve applied SQL files; add a new RPC migration with an empty search path and restricted execution.

## Policy and Contract Checks
- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map
- `spec.md`: Created from `.project/templates` by `delano project create`.
- `plan.md`: Created from `.project/templates` by `delano project create`.
- `workstreams/`: Created from `.project/templates` by `delano project create`.
- `tasks/`: Created from `.project/templates` by `delano project create`.

## Complexity Exceptions
- None recorded.

## Probe-Driven Architecture Changes

## Workstream Design
WS-A owns the PR 5 route, notice, provisioning, migration and focused verification.
The separate redesign delegate owns visual changes and will be integrated after review.

## Milestone Strategy
Integrate current main, repair behavior, run local checks, obtain final-head review, merge.

## Rollout Strategy
Apply the additive provisioning migration before code deployment. Configure the
optional legacy Stripe credential when historical subscriptions require offboarding.

## Test Strategy
Stripe request/response regression tests, authenticated API ownership checks,
isolated Supabase reset and concurrency checks, root tests/typecheck/lint/build,
brand audit, responsive notice browser checks and Delano validation.

## Rollback Strategy
Revert application changes if needed. The additive RPC can remain unused safely.
Do not roll back confirmed Stripe cancellations or rewrite applied history.

## Remaining Delivery Risks
Missing production credentials disable self-service cancellation with a support link.
No real subscriptions will be cancelled during testing. Codex review must complete before merge.
