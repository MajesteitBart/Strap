---
id: T-007
name: Document Keys and Vault
status: done
workstream: WS-A
created: 2026-07-26T07:48:49Z
updated: 2026-07-26T08:10:21Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [components/marketing/docs-page-view.tsx, tests/headless-access-vault.test.ts]
parallel: false
priority: high
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Document Keys and Vault

## Description

Add a dedicated public documentation chapter for the shipped agent access key and external credential Vault features, grounded in current implementation and permission boundaries.

## Acceptance Criteria

- [x] The docs distinguish scoped headless agent access keys from external credentials stored in Vault.
- [x] The agent access key guide covers creation, one-time visibility, modes, expiry, use, and revocation without claiming unsupported CLI commands.
- [x] The Vault guide covers create, reveal, rotate, delete, Personal and Company access, the 30-second reveal boundary, and the fact that values are not included in ordinary Strap reads.
- [x] Focused documentation regression checks, TypeScript, lint, build, brand audit, and responsive browser verification pass.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

- Agent access key guidance is grounded in `lib/headless-access.ts`, the signed-in `/api/app/headless-access` routes, and the MCP credential resolver.
- Vault guidance is grounded in `lib/api-key-vault.ts`, the signed-in `/api/app/vault` routes, and the service-role-only Vault RPCs.
- The public copy does not advertise a CLI API-key login command because the current Strap CLI uses browser OAuth.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-26T08:10:21Z: Docs now distinguish agent access keys from Vault credentials; 181 tests, explicit TypeScript, lint, brand audit, production build, Delano validation, and desktop/Pixel responsive preview checks passed.

- 2026-07-26T07:48:50Z: Document the two shipped key-management surfaces from implementation truth.
- 2026-07-26T07:48:49Z: Created from .project/templates/task.md by `delano task add`.
