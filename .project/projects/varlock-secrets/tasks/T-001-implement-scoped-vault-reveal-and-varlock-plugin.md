---
id: T-001
name: Implement scoped Vault reveal and Varlock plugin
status: done
workstream: WS-A
created: 2026-09-16T01:51:56Z
updated: 2026-09-16T02:12:38Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: false
priority: medium
estimate: L
operating_mode: feature
story_id:
acceptance_criteria_ids: []
---

# Task: Implement scoped Vault reveal and Varlock plugin

## Description

Implement the provider, explicit Vault item grants, audited reveal route and controls for key selection and reference copying.

## Acceptance Criteria

- [x] Existing keys cannot reveal secrets; explicitly selected items resolve with live authorization and required audit.
- [x] Packaged plugin loads in real Varlock and keeps credentials and secrets out of errors.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

See `updates/2026-09-16-local-verification.md` and the provider README for checked behavior and deployment requirements.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-16T02:12:38Z: Scoped grants, reveal endpoint, key picker, reference copy and portable Varlock provider implemented. Eight authorization behavior tests and six package tests pass; live API and real Varlock-to-Vault checks pass.

- 2026-09-16T01:51:57Z: User requested implementation on a feature branch; bounded provider contract is ready.
- 2026-09-16T01:51:56Z: Created from .project/templates/task.md by `delano task add`.
