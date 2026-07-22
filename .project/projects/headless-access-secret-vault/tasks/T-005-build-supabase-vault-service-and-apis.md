---
id: T-005
name: Build Supabase Vault service and APIs
status: done
workstream: WS-B
created: 2026-07-22T05:53:03Z
updated: 2026-07-22T06:11:18Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001]
conflicts_with: [lib/audit-log.ts, app/api/app/vault]
parallel: true
priority: high
estimate: L
operating_mode: multi-stream
story_id: US-004
acceptance_criteria_ids: [AC-007 AC-008 AC-009 AC-010]
---

# Task: Build Supabase Vault service and APIs

## Description

Implement strict Vault authorization, metadata listing, create/reveal/update/delete RPC calls, fail-closed reveal audit, no-store responses, and focused tests.

## Acceptance Criteria

- [x] Personal owners and company owners/admins can use Vault; company members and non-members are denied consistently.
- [x] List responses never include plaintext and reveal fails closed unless its audit event is persisted.
- [x] All app routes use requireApiAuth, strict bounds, no-store for sensitive responses, and never log secret values.

## Traceability
- Story: US-004
- Acceptance criteria: AC-007 AC-008 AC-009 AC-010

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T06:11:18Z: Implemented role-gated requireApiAuth Vault APIs, metadata-only list, transactional Supabase Vault RPC CRUD, no-store sensitive responses, and fail-closed reveal audit. Local SQL transaction created, revealed, rotated, and deleted a Vault secret; metadata had zero secret columns and execute grants were service-role-only.

- 2026-07-22T06:10:48Z: Task started with `delano task start`.

- 2026-07-22T06:10:48Z: Vault schema dependency passed and headless authentication workstream is complete.
- 2026-07-22T05:53:03Z: Created from .project/templates/task.md by `delano task add`.
