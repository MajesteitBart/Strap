---
id: T-001
name: Add headless, device, and Vault schema
status: done
workstream: WS-A
created: 2026-07-22T05:52:41Z
updated: 2026-07-22T06:08:16Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id: US-001
acceptance_criteria_ids: [AC-004 AC-005 AC-006 AC-007 AC-008]
---

# Task: Add headless, device, and Vault schema

## Description

Create the additive migration for headless credentials, OAuth device authorization state, Supabase Vault metadata, transactional restricted RPCs, indexes, RLS, and grants.

## Acceptance Criteria

- [x] Clean local migration creates all tables, constraints, indexes, and RLS without exposing rows to anon or authenticated roles.
- [x] Vault RPCs use SECURITY DEFINER with an empty search path, fully qualified objects, explicit PUBLIC/anon/authenticated revokes, and service_role grants.
- [x] Device approval and exchange state supports durable attempts, polling intervals, expiry, and atomic single-use consumption.

## Traceability
- Story: US-001
- Acceptance criteria: AC-004 AC-005 AC-006 AC-007 AC-008

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-22T06:08:16Z: Added 20260722120000_headless_access_and_secret_vault.sql; npx supabase db reset applied the complete migration chain successfully, including Supabase Vault and restricted RPCs.

- 2026-07-22T05:53:25Z: Task started with `delano task start`.

- 2026-07-22T05:53:25Z: Dependencies satisfied; begin additive schema foundation.
- 2026-07-22T05:52:41Z: Created from .project/templates/task.md by `delano task add`.
