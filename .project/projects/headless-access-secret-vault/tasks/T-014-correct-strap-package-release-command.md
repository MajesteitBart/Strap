---
id: T-014
name: Correct Strap package release command
status: done
workstream: WS-D
created: 2026-07-23T14:27:37Z
updated: 2026-07-23T19:08:49Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: true
priority: high
estimate: S
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Correct Strap package release command

## Description

Replace the unsafe root-level pack recipe with a root-copyable command that targets packages/strap and documents the expected scoped artifact.

## Acceptance Criteria

- [x] Running the documented pack command from the repository root exits 0 and reports @bvdm/strap@0.1.0.
- [x] The dry-run artifact contains exactly the intended 51 package files and does not include root application files.
- [x] The unsafe npm --prefix packages/strap pack --dry-run recipe is absent and no npm publication occurs.

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

- 2026-07-23T19:08:49Z: README now uses root-safe npm pack ./packages/strap --dry-run; verified from repository root that it returns @bvdm/strap@0.1.0 with exactly 51 intended files and no publication.

- 2026-07-23T19:08:12Z: Correct the root-copyable package verification command

- 2026-07-23T19:08:11Z: Readiness review passed: scoped documentation fix with binary acceptance criteria
- 2026-07-23T14:27:37Z: Created from .project/templates/task.md by `delano task add`.
