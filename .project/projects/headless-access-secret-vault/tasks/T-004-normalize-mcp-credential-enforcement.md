---
id: T-004
name: Normalize MCP credential enforcement
status: done
workstream: WS-A
created: 2026-07-22T05:53:03Z
updated: 2026-07-22T06:10:48Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-002 T-003]
conflicts_with: [app/mcp/route.ts, lib/oauth.ts]
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id: US-003
acceptance_criteria_ids: [AC-002 AC-003]
---

# Task: Normalize MCP credential enforcement

## Description

Accept API-key and OAuth grants through one resolver, make fallback credential-aware, digest rate-limit identifiers, clamp permissions, and strip mutation tokens before dispatch.

## Acceptance Criteria

- [x] API keys access only their explicit Creed and every request revalidates current membership.
- [x] Inaccessible explicit grants return empty state; only legacy OAuth without grant rows may use personal fallback.
- [x] Read keys cannot propose or direct edit and proposal keys cannot direct edit on personal or company Creeds.

## Traceability
- Story: US-003
- Acceptance criteria: AC-002 AC-003

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T06:10:48Z: Normalized OAuth/API-key credential grants in MCP; explicit inaccessible grants resolve empty, legacy fallback is schema-marked, bearer rate-limit keys are digested, and read/proposal mutation tokens plus section permissions are enforced on personal and company paths. Full tests and TypeScript pass.

- 2026-07-22T06:10:27Z: Task started with `delano task start`.

- 2026-07-22T06:10:27Z: Headless keys and device grant dependencies are complete.
- 2026-07-22T05:53:03Z: Created from .project/templates/task.md by `delano task add`.
