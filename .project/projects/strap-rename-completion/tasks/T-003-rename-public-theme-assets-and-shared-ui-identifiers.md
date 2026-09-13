---
id: T-003
name: Rename public theme assets and shared UI identifiers
status: done
workstream: WS-A
created: 2026-07-24T20:00:34Z
updated: 2026-07-24T20:15:44Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [app/globals.css, public/assets, components/ui, app/layout.tsx]
parallel: true
priority: high
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Rename public theme assets and shared UI identifiers

## Description

Implement inventory R-041 through R-047 and the rename-only portion of R-063 in app/globals.css, public assets, root manifest/icon metadata, and shared UI primitives. Keep current colors, geometry, and motion values unchanged.

## Acceptance Criteria

- [x] Active CSS namespaces, asset consumers, manifest/icon metadata, and shared UI brand identifiers are Strap-first.
- [x] Persisted rich-text or other legacy selectors retain explicit compatibility where required.
- [x] No visual redesign or behavior regression is introduced and focused checks pass.

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

- 2026-07-24T20:15:44Z: Canonicalized Strap CSS tokens/classes/keyframes, shared UI identifiers, backdrops, wordmark asset path, manifest/icons, and persisted rich-text compatibility without redesign. Removed eight verified-unreferenced landing binaries. Focused/full tests, TypeScript, ESLint, production build, and final active-source CSS residual scan passed.

- 2026-07-24T20:01:49Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:49Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:34Z: Created from .project/templates/task.md by `delano task add`.
