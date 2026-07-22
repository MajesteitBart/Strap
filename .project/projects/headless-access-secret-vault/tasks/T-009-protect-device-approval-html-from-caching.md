---
id: T-009
name: Protect device approval HTML from caching
status: done
workstream: WS-C
created: 2026-07-22T08:53:30Z
updated: 2026-07-22T08:54:45Z
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

# Task: Protect device approval HTML from caching

## Description

Apply the authenticated no-store cache policy to the OAuth device approval page after PR review.

## Acceptance Criteria

- [x] The /device route receives private, no-store headers in deployed Next.js configuration.
- [x] Focused regression coverage guards both /vault and /device no-store paths.

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

- 2026-07-22T08:54:45Z: Focused 9/9 headless tests, full 140/140 tests, TypeScript clean, lint 0 errors (one pre-existing warning), and production build pass.

- 2026-07-22T08:53:35Z: Address the new PR review cache finding before merge readiness.
- 2026-07-22T08:53:30Z: Created from .project/templates/task.md by `delano task add`.
