---
id: T-006
name: Add headless and Vault product UI
status: done
workstream: WS-C
created: 2026-07-22T05:53:03Z
updated: 2026-07-22T06:18:05Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-002 T-003 T-005]
conflicts_with: [components/creed/connections-screen.tsx, components/creed/shell.tsx]
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id: US-005
acceptance_criteria_ids: [AC-001 AC-007 AC-008]
---

# Task: Add headless and Vault product UI

## Description

Add Connections key/device guidance, a signed-in Vault route and navigation, one-time credential handling, secret CRUD interactions, and automatic reveal clearing.

## Acceptance Criteria

- [x] Users can create/copy/revoke headless keys and clearly understand one-time display, scope, and expiry.
- [x] Authorized users can create, list, reveal, update, and delete Vault items; reveal state clears automatically.
- [x] The signed-in navigation changes do not cause marketing routes to load user state.

## Traceability
- Story: US-005
- Acceptance criteria: AC-001 AC-007 AC-008

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T06:18:05Z: Added Connections headless key/device UI, signed-in Vault navigation and CRUD screen, one-time key handling, and 30-second reveal clearing. TypeScript and ESLint pass with only one pre-existing marketing warning; live dev rendering compiled /device, /vault, and /connections. T3 Preview interactive smoke is unavailable because its transport requires authentication, recorded for release evidence.

- 2026-07-22T06:11:18Z: Task started with `delano task start`.

- 2026-07-22T06:11:18Z: Headless and Vault server contracts are complete and verified.
- 2026-07-22T05:53:03Z: Created from .project/templates/task.md by `delano task add`.
