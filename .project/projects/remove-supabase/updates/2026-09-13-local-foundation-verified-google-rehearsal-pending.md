---
timestamp: 2026-09-13T20:12:08Z
status: in-progress
task: T-004
stream: WS-B
---

# Progress Update

## Completed
- T-001 through T-003: local Postgres 17.6, a squashed Drizzle baseline, database commands and a CI Postgres service.
- Catalog reconciliation of 388 retained application columns, 142 constraints and 99 indexes.
- 238 tests pass with database integration enabled; 215 pass and four database suites skip when `DATABASE_URL` is absent.
- TypeScript passes. ESLint has zero errors and six existing warnings. Production build, brand audit and dependency audit pass.
- Better Auth and repository probes pass against isolated local databases. See `../research/local-foundation-evidence.md` for scope and source references.

## In Progress
- T-004 real-user and Google callback verification. The local synthetic probe passes, but application session and persistence paths have not been switched.

## Blockers
- The owner selected the existing Google app, then requested skipping credential setup and the live rehearsal for now. T-004 is deferred. No Google credentials or redirect URIs were changed; live-provider verification remains outstanding.

## Next Actions
- Resume Google credential setup and the live provider rehearsal when the owner resumes that work.
- Continue the session, repository, authorization and platform-service replacements after that gate.
- Keep hosted provisioning, production cutover, commits and publication deferred. All changes are local and uncommitted on `feature/remove-supabase`.
