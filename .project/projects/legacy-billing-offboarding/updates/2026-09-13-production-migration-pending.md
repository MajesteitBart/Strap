---
timestamp: 2026-09-13T11:29:32Z
status: blocked
task: T-001
stream: WS-A
---

# Progress Update

## Completed
- Current-owner billing authorization passes the local API regression, including a stale historical billing owner and denial for that previous owner. Incomplete records retain profile-scoped support paths.
- Codex completed review of ac76508 with no new findings. Redesign integration preserves the new Settings layout and offboarding controls; 199 tests, strict types, lint and production build pass locally.

## In Progress
- Final integration review and production migration.

## Blockers
- The configured production database lacks the new provisioning RPC. This checkout has no management token or database password, and the current CLI account cannot access that project. The maintainer has been asked to configure credentials securely or apply the additive migration through the dashboard.

## Next Actions
- Apply `supabase/migrations/20260913092518_provision_company_atomic.sql` to the configured project before deploying the caller. Confirm the project ref and migration result, finish exact-head review and CI, then merge PR 5 and verify the production deployment.
