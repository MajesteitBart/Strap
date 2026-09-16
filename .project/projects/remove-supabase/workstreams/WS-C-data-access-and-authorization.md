---
id: WS-C
name: WS-C Data access and authorization
owner: MajesteitBart
status: active
created: 2026-09-13T17:49:12Z
updated: 2026-09-13T20:45:55Z
operating_mode: multi-stream
---

# Workstream: WS-C Data access and authorization

## Objective
Replace every PostgREST call with Drizzle repositories and replace row-level security with explicit guards.

## Owned Files/Areas
`lib/db/repositories/`, `lib/authz/`, `lib/strap-*`, `lib/company-*`, `lib/oauth*`, `lib/headless-access.ts`, `lib/skills.ts`, `lib/ai/*`, `lib/audit-log.ts`, `lib/welcome.ts`, `lib/legacy-subscription*`, `lib/panel/agent-execute.ts`, `app/api/**`, `app/mcp/route.ts`, and the OAuth and device routes.

## Dependencies
WS-A and T-004. The probe must confirm the rewrite pattern before T-008 scales.

## Risks
Silent authorization widening once RLS is gone. Behaviour drift inside `lib/strap-backend.ts` and `lib/company-sections.ts`. Transaction boundaries that PL/pgSQL used to own.

## Handoff Criteria
No `.from(` chains or `SupabaseLikeClient` references remain. The policy matrix has a passing negative test per row and a second-model review. The MCP contract tests are unchanged and green.
