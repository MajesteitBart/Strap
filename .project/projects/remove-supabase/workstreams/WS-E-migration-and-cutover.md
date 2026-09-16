---
id: WS-E
name: WS-E Migration and cutover
owner: MajesteitBart
status: active
created: 2026-09-13T17:49:12Z
updated: 2026-09-13T21:48:27Z
operating_mode: multi-stream
---

# Workstream: WS-E Migration and cutover

## Objective
Move production data and traffic to the new stack with a rehearsed rollback, then decommission Supabase.

## Owned Files/Areas
`scripts/migrate-from-supabase.mts`, the cutover runbook under `updates/`, Netlify environment variables, and the Supabase project lifecycle.

## Dependencies
WS-B, T-011, T-012, and WS-F. Bart's approval for the window, the environment flip, and the deletion.

## Risks
Writes lost inside the window. Provider lockout after callback changes. Reconciliation mismatches from tables with generated ids.

## Handoff Criteria
Row-count reconciliation matches for every table. Both users sign in on production. MCP reads with an existing token succeed. Supabase is paused, then deleted after 30 days with credentials revoked everywhere.
