---
id: T-004
name: Rebrand authenticated product auth and email surfaces
status: done
workstream: WS-B
created: 2026-07-23T02:05:38Z
updated: 2026-07-23T02:27:32Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001]
conflicts_with: []
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id: US-002
acceptance_criteria_ids: [AC-002 AC-005]
---

# Task: Rebrand authenticated product auth and email surfaces

## Description

Update visible Personal/Company app, onboarding, auth, settings, connection, vault, status, error, and email copy while preserving internal state contracts.

## Acceptance Criteria

- [x] Available authenticated and auth routes present Strap consistently.
- [x] Personal and Company permission and secret boundaries are unchanged.
- [x] No stable database event storage or internal module identifier is renamed for cosmetics.

## Traceability
- Story: US-002
- Acceptance criteria: AC-002 AC-005

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-23T02:27:32Z: Rebranded 69 authenticated/auth/email source files using string/JSX-only edits; regenerated email brandmarks and corrected logo rendering. TypeScript, full scoped ESLint, 142 tests, and diff checks pass.

- 2026-07-23T02:25:45Z: Apply string-literal and JSX-only Strap migration while preserving internal identifiers.

- 2026-07-23T02:25:45Z: Public rebrand complete; begin customer-visible authenticated/auth/email surfaces.
- 2026-07-23T02:05:38Z: Created from .project/templates/task.md by `delano task add`.
