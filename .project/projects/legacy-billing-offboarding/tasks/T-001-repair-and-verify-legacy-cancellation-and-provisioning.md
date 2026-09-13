---
id: T-001
name: Repair and verify legacy cancellation and provisioning
status: done
workstream: WS-A
created: 2026-09-13T09:25:19Z
updated: 2026-09-13T16:38:13Z
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

- [x] Only the current subscription owner can schedule cancellation; existing cancellation is idempotent and failures recover.
- [x] Company provisioning is atomic under concurrency and its RPC is unavailable to browser roles in the disposable verification database.
- [x] Applied migration history is preserved and a clean local Supabase reset plus focused runtime checks pass.
- [x] Root tests, TypeScript, lint, production build and brand audit pass after redesign integration (202 tests). Earlier browser and local API evidence covers the billing behavior.
- [x] Apply the additive migration to the configured production database, then merge after final integration checks and review.

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

- 2026-09-13T16:38:13Z: PR 5 passed final Codex review on 5bcd4ef0ec (comment 5653436485), merged as 0a85ca18, and deployed in Netlify 6aa69f61692ceb00086e8bca. Production migrations and service-only provisioning checks passed; earlier task evidence records 202 tests, types, lint, build and brand checks.

- 2026-09-13: The maintainer supplied the database password through the canonical environment file. The linked and configured project references matched. Dry-run identified only the pending Strap defaults and atomic Company migrations; both applied successfully. The production API advertises the RPC, executes its null-owner validation for the service key, and denies the anonymous role. No existing customer records were created or deleted by verification.
- 2026-09-13: The cancellation path now revalidates canonical Company ownership after the provider status read and before cancellation. Regression tests cover ownership transfer and ownership-query failure during that read, along with normal, scheduled and ended subscriptions.

- 2026-09-13T12:54:21Z: Production migrations applied; completing final review and deployment

- 2026-09-13T11:29:32Z: Production migration requires management credentials for the configured Supabase project. Local reset and runtime checks pass; the available CLI account cannot access this project. Do not deploy the RPC caller before applying the additive migration.

- 2026-09-13T09:25:19Z: Current branch integrates PR 5 with the current main branch.

- 2026-09-13T09:25:19Z: User approved finishing relevant unmerged work and PR-to-merge workflow on 2026-09-13.
- 2026-09-13T09:25:19Z: Created from .project/templates/task.md by `delano task add`.
