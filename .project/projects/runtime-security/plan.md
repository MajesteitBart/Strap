---
name: Runtime dependency security
status: active
lead: MajesteitBart
created: 2026-09-13T13:06:54Z
updated: 2026-09-13T13:06:55Z
linear_project_id:
risk_level: medium
spec_status_at_plan_time: planned
operating_mode: patch
---

# Delivery Plan: Runtime dependency security

## What Changed After Probe

## Technical Context

Keep Next at a patched 16.x release, with matching ESLint configuration and bundle analyzer. Preserve React 19 and the existing Webpack/Netlify build path. Apply compatible dependency fixes without force or unrelated major upgrades.

## Architecture Decisions

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
- WS-A / T-001 owns the dependency manifests, lockfile and regression evidence.

## Milestone Strategy

## Rollout Strategy
- Commit a focused repair branch, complete final-head Codex review and CI, then merge and verify Netlify's published commit and live routes.

## Test Strategy
- Run npm audit, the application suite, strict TypeScript, lint, production build, brand and Delano checks. Exercise the patched image route on the deploy preview and production.

## Rollback Strategy
- If the patched version fails its preview checks, repair it before merge. Keep the preceding deploy available while validating production; do not silently restore a vulnerable version.

## Remaining Delivery Risks
