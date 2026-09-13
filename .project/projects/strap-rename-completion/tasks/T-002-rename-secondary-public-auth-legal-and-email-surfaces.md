---
id: T-002
name: Rename secondary public auth legal and email surfaces
status: done
workstream: WS-A
created: 2026-07-24T20:00:33Z
updated: 2026-07-24T20:14:15Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [components/marketing/privacy-page-view.tsx, components/marketing/terms-page-view.tsx, components/auth, app/authorize/page.tsx, app/device/page.tsx, supabase/email-templates]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Rename secondary public auth legal and email surfaces

## Description

Implement inventory R-015 through R-040 in owned privacy, terms, company, examples, roadmap, learn, bench, changelog, auth, OAuth UI, device UI, invite, error, email, and legacy landing files. Follow each recorded user reply and preserve behavior.

## Acceptance Criteria

- [x] Owned public, auth, legal, email, and secondary content surfaces are Strap-first or intentionally removed per recorded user direction.
- [x] Unavailable homepage or product resources are labeled roadmap rather than shipped.
- [x] Focused route and copy checks pass without changing authentication boundaries.

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

- 2026-07-24T20:14:15Z: Implemented Strap-first secondary public/auth/learn/email/legal rename work, removed legal content and legacy source per user replies, preserved behavior, and passed TypeScript, focused ESLint, 11 focused tests, and diff check. Eight verified-unreferenced binaries remain staged for T-009 cleanup.

- 2026-07-24T20:01:48Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:47Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:33Z: Created from .project/templates/task.md by `delano task add`.
