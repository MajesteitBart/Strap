---
name: Release verification
status: done
lead: MajesteitBart
created: 2026-09-13T11:02:57Z
updated: 2026-09-13T11:24:20Z
linear_project_id:
risk_level: low
spec_status_at_plan_time: planned
operating_mode: patch
---

# Delivery Plan: Release verification

## Technical Context
Copy the already-tested workflow from the automation branch without the OpenWiki changes.

## Architecture Decisions
Run the application job and a two-package CLI matrix independently. Use manual dispatch as well as PR and main triggers.

## Policy and Contract Checks
- [x] Local contracts record evidence.
- [x] External writes are authorized by the current task.
- [x] No branch protection or paid review settings change.

## Workstream Design
WS-A owns the workflow and checks through reviewed merge.

## Test Strategy
Run the workflow commands locally and require all GitHub jobs and final-head Codex review before merge.

## Rollout Strategy
Merge the reviewed branch, then verify the first main push run.

## Rollback Strategy
Revert the workflow commit if it blocks valid changes; preserve application code.

## Remaining Delivery Risks
Base-branch redesign changes require an integration check before merge.
