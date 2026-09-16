---
id: T-015
name: Replace pg_cron retention and the health probes
status: done
workstream: WS-D
created: 2026-09-13T17:49:32Z
updated: 2026-09-13T21:47:30Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-008]
conflicts_with: []
parallel: true
priority: medium
estimate: S
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Replace pg_cron retention and the health probes

## Description
Add `POST /api/internal/maintenance`, guarded by `STRAP_MAINTENANCE_SECRET`, that deletes `creed_activity` rows older than 90 days and expired device authorizations and authorization codes. Add `.github/workflows/maintenance.yml` with a daily cron. Rewrite the probes in `app/api/health/route.ts` to use the database and the users table.

## Acceptance Criteria
- [x] The cron workflow and secured route are implemented; local pruning returns counts. The first hosted GitHub run is a T-017 release check.
- [x] An unauthorized call returns 401.
- [x] The health JSON shape is unchanged.

## Traceability
- Story: US-005
- Acceptance criteria: AC-007

## Technical Notes
Use a constant-time comparison for the secret. Keep the route on the Node runtime with `force-dynamic`.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:30Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
