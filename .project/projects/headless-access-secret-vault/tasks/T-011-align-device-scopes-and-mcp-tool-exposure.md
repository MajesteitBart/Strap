---
id: T-011
name: Align device scopes and MCP tool exposure
status: done
workstream: WS-A
created: 2026-07-22T09:23:35Z
updated: 2026-07-22T09:25:38Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: true
priority: high
estimate: S
operating_mode: feature
story_id:
acceptance_criteria_ids: []
---

# Task: Align device scopes and MCP tool exposure

## Description

Cap approved device access to the OAuth scope requested by the client and hide mutation tools from read-only credentials.

## Acceptance Criteria

- [x] A read-only device request cannot be approved for proposal or direct access, including forged form posts.
- [x] Read-only MCP credentials receive no proposal or edit tools from tools/list.
- [x] Targeted tests cover scope capping and read-only tool filtering.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T09:25:38Z: Focused 10/10 headless tests, full 141/141 tests, TypeScript clean, lint 0 errors (one pre-existing warning), and production build pass.

- 2026-07-22T09:23:41Z: Address final rereview scope escalation and read-only tool exposure findings.
- 2026-07-22T09:23:35Z: Created from .project/templates/task.md by `delano task add`.
