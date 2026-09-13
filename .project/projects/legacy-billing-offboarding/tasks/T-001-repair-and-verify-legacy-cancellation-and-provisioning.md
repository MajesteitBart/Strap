---
id: T-001
name: Repair and verify legacy cancellation and provisioning
status: in-progress
workstream: WS-A
created: 2026-09-13T09:25:19Z
updated: 2026-09-13T09:25:19Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: feature
story_id:
acceptance_criteria_ids: []
---

# Task: Repair and verify legacy cancellation and provisioning

## Description

Integrate PR 5 with current Strap paths, owner checks, reliable cancellation UX, forward-only atomic provisioning, focused tests, local DB reset and release evidence.

## Acceptance Criteria

- [ ] Only the current subscription owner can schedule cancellation; existing cancellation is idempotent and failures recover.
- [ ] Company provisioning is atomic under concurrency and its RPC is unavailable to browser roles.
- [ ] Applied migration history is preserved and a clean local Supabase reset plus focused runtime checks pass.
- [ ] Root tests, TypeScript, lint, production build, brand audit and browser checks pass.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-09-13T09:25:19Z: Current branch integrates PR 5 with the current main branch.

- 2026-09-13T09:25:19Z: User approved finishing relevant unmerged work and PR-to-merge workflow on 2026-09-13.
- 2026-09-13T09:25:19Z: Created from .project/templates/task.md by `delano task add`.
