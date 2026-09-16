---
id: T-016
name: Write and rehearse the Supabase export and import script
status: in-progress
workstream: WS-E
created: 2026-09-13T17:49:33Z
updated: 2026-09-13T21:48:27Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-004, T-011, T-012]
conflicts_with: []
parallel: false
priority: high
estimate: L
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Write and rehearse the Supabase export and import script

## Description
Write `scripts/migrate-from-supabase.mts`. It exports every public table, `auth.users`, `auth.identities`, and the Vault plaintext through the scoped source Vault view, transforms users and identities into Better Auth `users` and `accounts` rows, re-encrypts Vault secrets under `STRAP_VAULT_SECRET`, imports everything in one transaction, and prints a row-count reconciliation. Rehearse first into an empty local database and verify with browser and MCP checks. The hosted pooler, live Google/X sign-in and delivered Resend emails remain release checks.

## Acceptance Criteria
- [x] Reconciliation shows equal counts for every table.
- [ ] Both users sign in on the rehearsal deployment with their existing method.
- [ ] An MCP read with an existing OAuth token succeeds against the rehearsal deployment.
- [x] The script refuses populated and nonlocal targets; no force/overwrite flag exists.

## Traceability
- Story: US-001, US-003, US-004
- Acceptance criteria: AC-001, AC-002, AC-004

## Technical Notes
Passwords carry over as bcrypt hashes; the T-005 verify handles them. Google identities need `provider_id` as the account id. Sessions are not migrated; users sign in again. Never print secret values.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [ ] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:48:27Z: Script and local import rehearsal pass. Live providers, delivered emails and hosted rehearsal remain open.
- 2026-09-13: Planned from the Supabase surface inventory.
