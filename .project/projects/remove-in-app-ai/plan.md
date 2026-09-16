---
name: Remove in-app AI
status: done
lead: maintainer
created: 2026-09-16T09:28:21Z
updated: 2026-09-16T09:51:43Z
linear_project_id: 
risk_level: low
spec_status_at_plan_time: planned
operating_mode: feature
---

# Delivery Plan: Remove in-app AI

## What Changed After Probe
No probe. Source inspection identified read-only historical report compatibility as a retained boundary.

## Technical Context
Next.js app with external MCP agents, proposal review, and in-app OpenRouter callers.

## Architecture Decisions
Delete provider execution and endpoints. Keep the local command palette and external proposal workflow. Extract historical report validation/read into lib/quality-report.ts to preserve MCP compatibility. Retain database history and stored encrypted credentials without runtime consumers; no destructive migration.

## Workstream Design
WS-A owns runtime, UI, copy, documentation and regression verification in T-001.

## Test Strategy
Run root tests, strict types, lint, production build, brand audit and local browser smoke. Verify no AI requests occur and external proposal acceptance/rejection remains functional.

## Rollout and Rollback
Review this branch before deployment. Deploy application changes together; no schema migration. Revert the change to restore the prior app without data reconstruction.

## Risks
Retired endpoint callers receive 404. Old clients can still read stored quality reports; no new reports are generated. Provider secrets already configured are unused and are not revoked by this code change.

## Policy and Contract Checks
- Local Delano contracts track delivery.
- Probe skipped with source evidence.
- Tests and browser checks precede closure.
- No deployment or external tracker write is authorized by this task.

## Generated Artifact Map
Delano CLI created the spec, plan, decisions, WS-A and T-001. Authored bodies record scope and evidence.

## Complexity Exceptions
One sequential task spans the coupled UI and runtime deletion; no parallel work.

## Probe-Driven Architecture Changes
None.

## Milestone Strategy
Remove execution, remove UI and obsolete copy, then verify the external-agent review loop.

## Rollout Strategy
Review and deploy application changes together in a separate release step.

## Rollback Strategy
Revert the application change. Retained database history needs no restoration.

## Remaining Delivery Risks
Old browser tabs may call retired routes until reloaded. Existing stored model credentials remain unused.
