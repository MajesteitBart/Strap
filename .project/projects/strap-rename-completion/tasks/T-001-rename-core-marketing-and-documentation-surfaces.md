---
id: T-001
name: Rename core marketing and documentation surfaces
status: done
workstream: WS-A
created: 2026-07-24T20:00:33Z
updated: 2026-07-24T20:14:15Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [components/marketing/docs-page-view.tsx, components/marketing/strap-home.tsx, app/llms.txt, app/llms-full.txt, app/api/og, lib/marketing/brand.ts]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Rename core marketing and documentation surfaces

## Description

Implement inventory R-001 through R-014 and R-029 through R-032 in owned core marketing, documentation, metadata, FAQ, llms, OG, and brand files. Preserve current visual behavior and defer redesign.

## Acceptance Criteria

- [x] Owned active surfaces use Strap naming and accurate shipped or roadmap copy with no unintended customer-visible Creed branding.
- [x] Marketing route state isolation and existing behavior remain intact.
- [x] Focused checks for changed marketing and metadata surfaces pass.

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

- 2026-07-24T20:14:15Z: Implemented Strap-first core marketing/docs/metadata/FAQ/llms content and migrated all marketing CSS callers. Focused tests, ESLint, TypeScript, and diff check passed. Visual redesign portions are deferred by approved rename-first sequencing.

- 2026-07-24T20:01:47Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:47Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:33Z: Created from .project/templates/task.md by `delano task add`.
