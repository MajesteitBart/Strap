---
id: T-002
name: Build headless API key management
status: done
workstream: WS-A
created: 2026-07-22T05:52:41Z
updated: 2026-07-22T06:09:20Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001]
conflicts_with: [lib/audit-log.ts, app/api/app/headless-access]
parallel: true
priority: high
estimate: L
operating_mode: multi-stream
story_id: US-001
acceptance_criteria_ids: [AC-001 AC-003 AC-010]
---

# Task: Build headless API key management

## Description

Implement key creation, hashing, listing, revocation, authorization, expiry, access mode, audit events, and authenticated app routes.

## Acceptance Criteria

- [x] Full key is returned exactly once; all persisted and listed data is hash/prefix/metadata only.
- [x] Every app route uses requireApiAuth and revalidates Creed membership; revocation and expiry deny use.
- [x] Focused tests cover malformed, unauthorized, expired, and revoked keys.

## Traceability
- Story: US-001
- Acceptance criteria: AC-001 AC-003 AC-010

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T06:09:20Z: Implemented hash-only key service and requireApiAuth management routes with live membership checks, expiry/revocation, metadata-only listing, audit events, passing focused tests, and clean TypeScript.

- 2026-07-22T06:08:16Z: Task started with `delano task start`.

- 2026-07-22T06:08:16Z: Schema dependency passed clean local reset.
- 2026-07-22T05:52:41Z: Created from .project/templates/task.md by `delano task add`.
