---
id: T-001
name: Redesign public website and documentation surfaces
status: done
workstream: WS-A
created: 2026-07-24T21:18:46Z
updated: 2026-09-13T10:29:12Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [components/marketing, app/public-routes, app/globals.css]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Redesign public website and documentation surfaces

## Description

Apply the approved Strap visual language to the inner site shell, docs, pricing, product pages, Learn, Bench, Changelog, legal placeholders, and public error states.

## Acceptance Criteria

- [x] Public surfaces use one approved Strap visual system at desktop and mobile widths.

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

- 2026-09-13T10:29:12Z: Commit 2c1712b plus fixes: every inner public page, 404, and error state composes the shared shell, hero, and primitives; legacy chrome and backdrops removed. Headless Chrome evidence at 1440 and 390 for all public routes, open mobile menu, keyboard focus with a 2px ink outline, Escape returning focus to the toggle, reduced-motion emulation; no overflow, no console errors. Screenshots in the main checkout .agents/logs/redesign-shots/ directory.

- 2026-09-13T09:56:17Z: Approved worktable direction; rebuilding inner public pages on the shared shell.
- 2026-07-24T21:18:46Z: Created from .project/templates/task.md by `delano task add`.

- 2026-09-13: Coordinator reviewed the implementation and browser evidence, completed local role/empty-profile checks, and verified all local quality gates. Acceptance checkboxes reconciled with this evidence. External PR review and merge are the remaining release gates.
