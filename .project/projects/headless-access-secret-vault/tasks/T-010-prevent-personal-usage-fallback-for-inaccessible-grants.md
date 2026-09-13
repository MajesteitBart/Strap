---
id: T-010
name: Prevent Personal usage fallback for inaccessible grants
status: done
workstream: WS-A
created: 2026-07-22T09:09:34Z
updated: 2026-07-22T09:11:27Z
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

# Task: Prevent Personal usage fallback for inaccessible grants

## Description

Do not record Personal MCP usage when an explicit OAuth Creed grant resolves to an empty inaccessible state.

## Acceptance Criteria

- [x] MCP usage recording only runs when a Creed was actually loaded for the credential.
- [x] Regression coverage guards the usage-recording boundary for empty explicit grants.

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

- 2026-07-22T09:11:27Z: Focused 9/9 headless tests, full 140/140 tests, TypeScript clean, lint 0 errors (one pre-existing warning), and production build pass.

- 2026-07-22T09:09:39Z: Address final automated review feedback on inaccessible explicit grants.
- 2026-07-22T09:09:34Z: Created from .project/templates/task.md by `delano task add`.
