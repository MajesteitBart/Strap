---
id: T-003
name: Implement OAuth device authorization
status: done
workstream: WS-A
created: 2026-07-22T05:52:41Z
updated: 2026-07-22T06:10:27Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001]
conflicts_with: [lib/oauth.ts, app/token/route.ts, app/.well-known/oauth-authorization-server/route.ts, lib/audit-log.ts]
parallel: false
priority: high
estimate: XL
operating_mode: multi-stream
story_id: US-002
acceptance_criteria_ids: [AC-004 AC-005 AC-006]
---

# Task: Implement OAuth device authorization

## Description

Implement RFC 8628 device request, verification/consent, approval/denial, token exchange, discovery metadata, durable abuse controls, and audit events.

## Acceptance Criteria

- [x] The device grant returns and enforces standard fields, errors, expiry, ten-attempt invalidation, per-IP limits, and slow_down plus five seconds.
- [x] Approval visibly identifies the client, selects one accessible Creed, and token exchange consumes approval once.
- [x] Existing authorization_code and refresh_token behavior remains covered and green.

## Traceability
- Story: US-002
- Acceptance criteria: AC-004 AC-005 AC-006

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T06:10:27Z: Implemented RFC 8628 request, verification, consent, denial, durable polling/slow_down, ten-attempt invalidation, atomic consumption, token exchange, and discovery. Local SQL probes returned authorization_pending then slow_down, denied at 10 attempts, and confirmed service-role-only execute grants; full tests/typecheck pass.

- 2026-07-22T06:09:20Z: Task started with `delano task start`.

- 2026-07-22T06:09:20Z: Schema dependency passed; device implementation is ready for verification.
- 2026-07-22T05:52:41Z: Created from .project/templates/task.md by `delano task add`.
