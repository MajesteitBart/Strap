---
id: T-006
name: Complete Strap CLI rename and release preparation
status: done
workstream: WS-C
created: 2026-07-24T20:00:35Z
updated: 2026-07-24T20:14:17Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [package.json, packages/strap, packages/creed-cli]
parallel: true
priority: high
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Complete Strap CLI rename and release preparation

## Description

Implement inventory R-081 through R-085 in root package metadata and packages/strap, preserving user-authored worktree changes and packages/creed-cli compatibility. Prepare but do not publish; T-010 owns the external publication.

## Acceptance Criteria

- [x] @bvdm/strap metadata, help, config, attribution, tests, and primary root coverage are Strap-first.
- [x] packages/creed-cli remains a working explicit compatibility package.
- [x] Strap CLI test, typecheck, lint, pack, and clean-install smoke pass.

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

- 2026-07-24T20:14:17Z: Prepared @bvdm/strap 0.1.1 and legacy CLI compatibility with package/root tests, both CLI typechecks, root TypeScript/lint, pack, and clean-install smoke passing. External npm publication remains staged for T-010.

- 2026-07-24T20:01:51Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:51Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:35Z: Created from .project/templates/task.md by `delano task add`.
