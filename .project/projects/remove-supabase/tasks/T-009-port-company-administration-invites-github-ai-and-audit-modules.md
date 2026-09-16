---
id: T-009
name: Port company administration, invites, GitHub, AI, and audit modules
status: done
workstream: WS-C
created: 2026-09-13T17:49:31Z
updated: 2026-09-13T21:47:29Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-008]
conflicts_with: []
parallel: true
priority: medium
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Port company administration, invites, GitHub, AI, and audit modules

## Description
Port `lib/company-admin.ts`, `lib/company-invites.ts`, `lib/company-provision.ts`, `lib/company-github.ts`, `lib/company-version-control.ts`, `lib/github-version-control.ts`, `lib/github.ts`, `lib/ai/credits.ts`, `lib/ai/persistence.ts`, `lib/ai/quality.ts`, `lib/audit-log.ts`, `lib/legacy-subscriptions.ts`, `lib/legacy-subscription-deletion.ts`, `lib/panel/agent-execute.ts`, and their routes.

## Acceptance Criteria
- [x] Invites, role changes, ownership transfer, GitHub push and pull, AI usage limits, and audit rows behave as before.
- [x] Company provisioning stays atomic, either through the kept SQL function or a Drizzle transaction.
- [x] `tests/company-*.test.ts`, `tests/github-roundtrip.test.ts`, and `tests/legacy-subscriptions.test.ts` pass.

## Traceability
- Story: US-002
- Acceptance criteria: AC-001

## Technical Notes
Audit writes must keep their required and best-effort variants; the Vault reveal in T-012 depends on the required one.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:29Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
