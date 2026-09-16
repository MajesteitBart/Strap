---
id: WS-A
name: WS-A Database foundation
owner: MajesteitBart
status: done
created: 2026-09-13T17:49:11Z
updated: 2026-09-13T20:08:30Z
operating_mode: multi-stream
---

# Workstream: WS-A Database foundation

## Objective
Stand up plain Postgres, the Drizzle schema baseline, migration tooling, a local development database, and CI integration tests.

## Owned Files/Areas
`db/`, `lib/db/client.ts`, `docker-compose.yml`, `tests/db/`, `.github/workflows/verify.yml`, and the `db:*` package scripts.

## Dependencies
Decision D-1 on the host. Nothing else.

## Risks
Schema drift between the squashed baseline and the live Supabase schema. Prepared-statement problems through a connection pooler. Squashing hides intent that only lived in migration comments.

## Handoff Criteria
An empty database migrates to the full schema. CI runs the integration suite on a Postgres service. The schema diff against a Supabase dump lists only intended removals.
