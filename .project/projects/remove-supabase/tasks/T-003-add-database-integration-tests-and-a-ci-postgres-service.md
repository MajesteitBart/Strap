---
id: T-003
name: Add database integration tests and a CI Postgres service
status: done
workstream: WS-A
created: 2026-09-13T17:49:29Z
updated: 2026-09-13T20:08:30Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-002]
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Add database integration tests and a CI Postgres service

## Description
Add a `tests/db/` harness that connects through `DATABASE_URL`, truncates between tests, and ports the 34 pgTAP assertions from `supabase/tests/` (skills membership, publication, quota, and role denials) to node:test. Add a `postgres:17` service to `.github/workflows/verify.yml`.

## Acceptance Criteria
- [x] CI is configured to apply migrations to its Postgres service and run the suite; the local CI-equivalent run passes. The hosted workflow run remains deferred with publication.
- [x] Local runs skip the suite cleanly when `DATABASE_URL` is unset.
- [x] Every former pgTAP assertion has a node:test equivalent or a recorded reason for removal.

## Traceability
- Story: US-005
- Acceptance criteria: AC-006

## Technical Notes
Role-based denials become authorization guard tests once T-011 lands. Until then, assert the schema and function behaviour only.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T20:08:30Z: 23 database tests pass locally. All 22 functional pgTAP assertions ported; 12 obsolete direct-SQL role checks have explicit removal reasons in research/local-foundation-evidence.md. CI service and migrations configured; hosted CI run not requested.

- 2026-09-13T20:08:30Z: CI Postgres service and isolated database suites implemented.

- 2026-09-13T20:08:30Z: Baseline and retained functions verified.
- 2026-09-13: Planned from the Supabase surface inventory.
