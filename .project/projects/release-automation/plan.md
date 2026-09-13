---
name: Release automation
status: active
lead: Codex
created: 2026-09-13T09:35:41Z
updated: 2026-09-13T09:35:41Z
linear_project_id: 
risk_level: medium
spec_status_at_plan_time: planned
operating_mode: patch
---

# Delivery Plan: Release automation

## Technical Context
OpenWiki provider selection is independent of supplying an API key. The root project and CLI packages have separate verification commands.

## Architecture Decisions
- Pin OpenWiki 0.5.1 and action commits.
- Set OPENWIKI_PROVIDER to openrouter.
- Keep the credential in GitHub Actions secrets, supplied only to steps that require it.
- Restrict generated PR paths to openwiki and restore authored instruction/workflow files.
- Run app and CLI checks as separate jobs with read-only repository access.

## Policy and Contract Checks
- [x] Local project records remain delivery truth.
- [x] No technical probe is needed for the confirmed configuration failure.
- [x] Verification is defined before merge.
- [x] User authorized these GitHub writes.

## Workstream Design
WS-A owns workflow configuration and verification.

## Milestone Strategy
Repair, verify locally, commit and push, run the repaired workflow, review the final head, merge.

## Rollout Strategy
Set the project key securely and run the feature-branch workflow before merging.

## Test Strategy
Root tests, TypeScript, lint, brand audit and build; both CLI package checks; workflow YAML parsing and live Actions execution.

## Rollback Strategy
Revert workflow changes. Repository secrets remain server-side and can be removed independently.

## Remaining Delivery Risks
Provider quota or GitHub review availability may block external verification. Report those separately from local results.
