---
id: T-012
name: Move Vault secrets to application-level encryption
status: done
workstream: WS-D
created: 2026-09-13T17:49:32Z
updated: 2026-09-13T21:47:30Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-008]
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Move Vault secrets to application-level encryption

## Description
Add `secret_ciphertext` to `creed_vault_items`, port the four Vault RPCs into `lib/api-key-vault.ts` using AES-256-GCM under `STRAP_VAULT_SECRET`, keep the audit-before-plaintext order for reveal, and update the copy in `components/strap/api-key-vault-screen.tsx`.

## Acceptance Criteria
- [x] Create, reveal, rotate, and delete pass integration tests.
- [x] Reveal without a persisted audit row returns 503 and no plaintext.
- [x] Lists, logs, and MCP responses contain metadata or `secret://` references only.
- [x] `.env.example` documents `STRAP_VAULT_SECRET` and its separation from `STRAP_ENCRYPTION_SECRET`.

## Traceability
- Story: US-004
- Acceptance criteria: AC-004

## Technical Notes
Generalise `lib/secret-crypto.ts` to accept a key selector rather than duplicating the cipher code. Record the manual re-encrypt procedure for key rotation in the task evidence.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:30Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
