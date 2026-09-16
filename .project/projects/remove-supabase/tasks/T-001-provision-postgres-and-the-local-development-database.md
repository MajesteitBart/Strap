---
id: T-001
name: Provision Postgres and the local development database
status: done
workstream: WS-A
created: 2026-09-13T17:49:28Z
updated: 2026-09-13T18:17:21Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: false
priority: high
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Provision Postgres and the local development database

## Description
Add Docker Compose Postgres 17 for local work and `lib/db/client.ts` with the `postgres` driver and Drizzle. Document `DATABASE_URL` in `.env.example`. Owner direction on 2026-09-13 defers hosted provisioning until local rehearsal.

## Acceptance Criteria
- [x] `npm run db:ping` reaches the local database. Hosted verification is deferred under D-1.
- [x] `.env.example` documents `DATABASE_URL` and the pooled connection requirement.
- [x] No credential is committed. `.env.local` holds the local values.

## Traceability
- Story: US-005
- Acceptance criteria: AC-005

## Technical Notes
Use the pooled connection string on the host. Configure `max: 1` and `prepare: false` so Netlify function instances and the pooler cooperate. Require TLS on hosted connections. Ask Bart before creating paid infrastructure.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T18:17:21Z: Local Postgres 17.6 running via loopback-only Docker Compose at port 55433; db:ping passes, local env configured, max 1 unprepared driver and mandatory hosted TLS. Hosted provisioning deferred by owner.

- 2026-09-13T18:09:46Z: Implement local Postgres and Drizzle foundation.

- 2026-09-13T18:09:45Z: Owner authorized implementation on a feature branch with local Postgres first; hosted provisioning deferred.
- 2026-09-13: Planned from the Supabase surface inventory.
