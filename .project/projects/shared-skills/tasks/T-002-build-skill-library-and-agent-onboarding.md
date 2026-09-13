---
id: T-002
name: Build skill library and agent onboarding
status: done
workstream: WS-A
created: 2026-09-13T13:38:18Z
updated: 2026-09-13T15:18:44Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001]
conflicts_with: []
parallel: false
priority: medium
estimate: L
operating_mode: feature
story_id:
acceptance_criteria_ids: []
---

# Task: Build skill library and agent onboarding

## Description
Build the Personal and Company skill library, editing/import/export/history flows, profile switching, and device/agent setup. Browser acceptance now passes in a separate Chrome session explicitly approved by the user after T3 Preview became unavailable. Final release review and publication remain tracked in T-004.

## Acceptance Criteria

- [x] Personal and Company screens support import, edit, archive, download, and version restore with visible permission and error states.
- [x] Connected agents discover shared skill metadata and fetch selected bundles.

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

- 2026-09-13T15:18:44Z: Personal and Company browser acceptance passed with approved Chrome fallback at desktop and mobile sizes; native import/archive/restore, dirty guards, member permissions, device setup, and two-model MCP checks pass. See browser-and-sync-review update.

- 2026-09-13T14:42:25Z: Library implemented; remaining browser acceptance pending visible Preview.
- 2026-09-13T13:38:18Z: Created from .project/templates/task.md by `delano task add`.
