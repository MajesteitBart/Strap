---
id: T-001
name: Persist versioned profile skill bundles
status: done
workstream: WS-A
created: 2026-09-13T13:38:18Z
updated: 2026-09-13T14:42:24Z
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

# Task: Persist versioned profile skill bundles

## Description
Implement bounded standard skill bundles, revision history, service-only persistence, session APIs, and explicitly scoped MCP tools. Local implementation review is complete; final PR review belongs to T-004.

## Acceptance Criteria

- [x] Local database reset and role, stale revision, and concurrent publication tests pass.
- [x] Browser and MCP APIs enforce profile access and return bounded validated bundles.

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

- 2026-09-13T14:42:24Z: Final disposable reset, 23 SQL tests, and live session/MCP role and concurrency tests pass. Local code review complete; final PR review tracked in T-004.

- 2026-09-13T13:38:19Z: User explicitly requested shared skills across devices and agent onboarding.
- 2026-09-13T13:38:18Z: Created from .project/templates/task.md by `delano task add`.
