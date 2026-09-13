---
id: T-003
name: Redesign signed-in Personal and Company Strap experience
status: done
workstream: WS-C
created: 2026-07-24T21:18:47Z
updated: 2026-09-13T10:29:13Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: []
conflicts_with: [components/strap, app/(strap-app), app/globals.css]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id: 
acceptance_criteria_ids: []
---

# Task: Redesign signed-in Personal and Company Strap experience

## Description

Apply the approved Strap visual language to the shell, editor, connections, keys, settings, command panel, onboarding, and first-run states without changing product semantics.

## Acceptance Criteria

- [x] Personal and Company Strap flows use one cohesive approved design language and preserve all permissions and behavior.

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

- 2026-09-13T10:29:13Z: Commits 31ead13, a98206c, and the review fix commit: paper sidebar with frame line and focus rings, tinted active rows, square swatches, 194 status hexes mapped to tokens with dark twins, semibold display headings, snapped radii, framed overlays, resource-palette copy cycle, adaptive brand in dark mode. Captured file, connections, vault, settings, onboarding, device, command panel, mobile file, settings, and vault, dark mode, and Company mode via the cookie-only switcher; no pending boundaries, overflow, or console errors.

- 2026-09-13T09:56:18Z: Approved worktable direction; signed-in shell and product surfaces.
- 2026-07-24T21:18:47Z: Created from .project/templates/task.md by `delano task add`.

- 2026-09-13: Coordinator reviewed the implementation and browser evidence, completed local role/empty-profile checks, and verified all local quality gates. Acceptance checkboxes reconciled with this evidence. External PR review and merge are the remaining release gates.
