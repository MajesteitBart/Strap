---
timestamp: 2026-09-13T11:29:32Z
status: in-progress
task: T-001
stream: WS-A
---

# Progress Update

## Completed
- Current-owner billing authorization passes the local API regression, including a stale historical billing owner and denial for that previous owner. Incomplete records retain profile-scoped support paths.
- Codex completed review of ac76508 with no new findings. Redesign integration preserves the new Settings layout and offboarding controls; 200 tests, strict types, lint and production build pass locally.

## In Progress
- Final integration review and production deployment. The latest repair passes 202 tests, strict TypeScript, lint and production build.

## Blockers
- Resolved: the maintainer supplied the database password in the canonical environment file. On 2026-09-13 the CLI applied the pending Strap profile defaults and atomic Company provisioning migrations to the confirmed project. API verification confirms the service key reaches the new RPC and the anonymous role cannot execute it.

## Next Actions
- Finish exact-head review and CI, then merge PR 5 and verify the production deployment.
