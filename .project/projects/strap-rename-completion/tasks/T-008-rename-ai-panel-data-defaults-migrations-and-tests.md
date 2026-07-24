---
id: T-008
name: Rename AI panel data defaults migrations and tests
status: done
workstream: WS-D
created: 2026-07-24T20:00:36Z
updated: 2026-07-24T20:10:14Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [lib/ai, lib/panel, lib/creed-attribution.ts, supabase/migrations, tests]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Rename AI panel data defaults migrations and tests

## Description

Implement inventory R-099 through R-111 in lib/ai, lib/panel, attribution, Supabase forward migrations, general active tests, compatibility classification, and archive strategy. Do not edit T-007-owned protocol files.

## Acceptance Criteria

- [x] AI and panel prose/schema canonical values, attribution, future database defaults, and active tests are Strap-first.
- [x] Forward migrations preserve intentional user data and compatibility while avoiding edits to applied migrations.
- [x] Focused AI, panel, migration-text, and test-contract checks pass.

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

- 2026-07-24T20:10:14Z: Implemented Strap-first AI quality, panel schemas/prose with legacy parser compatibility, Strap attribution path, forward migration for profile/Vault defaults, and refreshed tests. npm test 164/164, focused 31/31, TypeScript, ESLint, diff check, and npx supabase db reset passed. R-108 cross-cutting path/schema integration remains assigned to T-009.

- 2026-07-24T20:01:53Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:53Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:36Z: Created from .project/templates/task.md by `delano task add`.
