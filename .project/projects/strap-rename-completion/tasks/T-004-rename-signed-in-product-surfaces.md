---
id: T-004
name: Rename signed-in product surfaces
status: done
workstream: WS-B
created: 2026-07-24T20:00:34Z
updated: 2026-07-24T20:14:16Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [components/creed, app/(creed-app)]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Rename signed-in product surfaces

## Description

Implement inventory R-048 through R-065 except broad directory moves, which are staged in T-009. Own components/creed and app/(creed-app) customer-visible copy, export names, first-party attribution, brand exports, onboarding, shell, editor, connections, vault, settings, panel, and first-run states. Preserve visual behavior.

## Acceptance Criteria

- [x] Signed-in Personal and Company UI copy, exports, attribution, and component exports are Strap-first.
- [x] Editing, proposal, history, connection, Vault, onboarding, settings, and permission behavior remain unchanged.
- [x] Focused TypeScript and relevant product tests pass.

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

- 2026-07-24T20:14:16Z: Implemented Strap-first signed-in product copy, exports, metadata, brand aliases, attribution normalization, and all product CSS callers. npm test 174/174, TypeScript, scoped ESLint, and diff check passed. Broad path moves remain staged for T-009.

- 2026-07-24T20:01:50Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:49Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:34Z: Created from .project/templates/task.md by `delano task add`.
