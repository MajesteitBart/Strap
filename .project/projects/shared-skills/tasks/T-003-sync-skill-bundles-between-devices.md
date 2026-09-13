---
id: T-003
name: Sync skill bundles between devices
status: done
workstream: WS-A
created: 2026-09-13T13:38:18Z
updated: 2026-09-13T14:42:25Z
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

# Task: Sync skill bundles between devices

## Description
Implement CLI list, push, pull, sync, dry-run, profile-bound ledgers, safe file replacement, and recoverable backups. Local implementation review is complete; final PR review and npm publication belong to T-004.

## Acceptance Criteria

- [x] CLI publication, pull, and sync work across two isolated device directories.
- [x] Stale, modified, symlinked, and unsafe-path bundles cannot silently overwrite local or remote work.

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

- 2026-09-13T14:42:25Z: 37 CLI tests, strict types, package dry-run, and real two-device MCP sync pass; final PR review and npm release tracked in T-004.

- 2026-09-13T14:42:25Z: Device sync implementation ready for verified closeout.
- 2026-09-13T13:38:18Z: Created from .project/templates/task.md by `delano task add`.
