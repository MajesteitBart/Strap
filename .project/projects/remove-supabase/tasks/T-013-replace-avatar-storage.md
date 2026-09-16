---
id: T-013
name: Replace avatar storage
status: done
workstream: WS-D
created: 2026-09-13T17:49:32Z
updated: 2026-09-13T21:47:30Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-007, T-008]
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Replace avatar storage

## Description
Add `user_avatars` and `creed_avatars` tables with `bytea` bodies, content type, and a content hash. The upload route stores bytes; `/api/avatars/[kind]/[id]` serves them with long cache headers keyed by the hash. Update `next.config.ts` remote patterns and the Netlify remote image list. Provider avatar URLs from Google and X stay allowed.

## Acceptance Criteria
- [x] Upload, replace, and display work for Personal and Company avatars.
- [x] The 3 MiB size limit and the MIME allowlist are enforced server-side.
- [x] Old `*.supabase.co` avatar URLs no longer appear in stored user or profile rows after the import.

## Traceability
- Story: US-001, US-002
- Acceptance criteria: AC-001

## Technical Notes
Production has 0 stored objects, so no binary migration is needed. Keep the route on the Node runtime.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:30Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
