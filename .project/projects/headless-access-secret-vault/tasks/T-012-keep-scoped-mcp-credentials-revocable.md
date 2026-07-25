---
id: T-012
name: Keep scoped MCP credentials revocable
status: done
workstream: WS-A
created: 2026-07-22T09:40:55Z
updated: 2026-07-22T09:42:48Z
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

# Task: Keep scoped MCP credentials revocable

## Description

Remove durable legacy write tokens from scoped MCP read responses and keep headless API-key usage out of the OAuth connection roster.

## Acceptance Criteria

- [x] read_creed never returns proposal or direct-edit bearer tokens to scoped MCP clients.
- [x] Headless API-key requests do not create OAuth-disconnect roster state.
- [x] Targeted regressions guard both credential-lifecycle boundaries.

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

- 2026-07-22T09:42:48Z: Focused 10/10 headless tests, full 141/141 tests, TypeScript clean, lint 0 errors (one pre-existing warning), and production build pass.

- 2026-07-22T09:41:05Z: Address rereview findings on durable token leakage and API-key OAuth roster drift.
- 2026-07-22T09:40:55Z: Created from .project/templates/task.md by `delano task add`.
