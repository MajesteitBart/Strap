---
id: T-002
name: Define the baseline schema and migration tooling
status: done
workstream: WS-A
created: 2026-09-13T17:49:28Z
updated: 2026-09-13T20:08:29Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-001]
conflicts_with: []
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Define the baseline schema and migration tooling

## Description
Produce `db/schema/*.ts` from a schema-only dump, remove provider-specific objects, keep the plain PL/pgSQL functions that still have callers, and generate one baseline migration with drizzle-kit. Add `db:generate` and `db:migrate` scripts. Under the local-first direction, the source is the applied local database whose 61 migration versions exactly match this checkout. It has 37 current public tables; the initial inventory count of 39 included historical definitions.

## Acceptance Criteria
- [x] A fresh local database migrates from empty to the full schema.
- [x] The schema diff against the Supabase dump lists only intended removals: `auth` references, RLS, roles and grants, `vault`, `storage`, `pg_cron`, `supabase_realtime`, RLS helper functions, Vault RPCs, and unused billing functions.
- [x] No `auth.` reference remains in the baseline.

## Traceability
- Story: US-005
- Acceptance criteria: AC-005, AC-006

## Technical Notes
Keep `creed_*` and `strap_*` names unchanged. Keep `provision_company_creed`, `transfer_creed_ownership`, `consume_oauth_device_authorization`, `record_oauth_device_verification`, `increment_mcp_read_for_creed`, and the `strap_skill*` functions unless T-009 or T-010 ports them to transactions. The users table lands in T-004; use a placeholder `users(id uuid primary key)` here so foreign keys compile.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T20:08:29Z: Generated and replayed the squashed baseline on local Postgres 17.6. Catalog comparison matches 388 application columns, 142 constraints and 99 indexes; repeat migration and retained-function tests pass. See research/local-foundation-evidence.md.

- 2026-09-13T18:17:22Z: Baseline generated and applied; schema comparison and function tests underway.

- 2026-09-13T18:17:21Z: Local foundation verified.
- 2026-09-13: Planned from the Supabase surface inventory.
