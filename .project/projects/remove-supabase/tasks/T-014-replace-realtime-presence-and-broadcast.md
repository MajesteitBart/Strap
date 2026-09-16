---
id: T-014
name: Replace realtime presence and broadcast
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

# Task: Replace realtime presence and broadcast

## Description
Remove the presence channel, the broadcast event, and the `RealtimeChannel` type from `components/strap/strap-provider.tsx`. Keep the adaptive poll and its fast cadence on local activity. Remove any UI that only presence fed.

## Acceptance Criteria
- [x] Company edits from a second session appear within one poll interval.
- [x] No Supabase import remains under `components/`.
- [x] Decision D-3 and any copy change are noted in the evidence log.

## Traceability
- Story: US-002
- Acceptance criteria: AC-001

## Technical Notes
If Bart chooses Ably instead, this task becomes an adapter behind the same `trackEditingPresence` and `broadcastStateChanged` functions.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:30Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
