---
id: T-020
name: Update docs, marketing copy, context pack, and OpenWiki sources
status: done
workstream: WS-F
created: 2026-09-13T17:49:34Z
updated: 2026-09-13T21:48:27Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-019]
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Update docs, marketing copy, context pack, and OpenWiki sources

## Description
Update `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, `BOOTSTRAP.md`, `.env.example`, `components/marketing/stack-page-view.tsx`, `app/docs`, the privacy page if it names Supabase, `components/auth/backend-setup-screen.tsx`, `.project/context/*`, and the `strap-repo` skill references. OpenWiki regenerates from sources after merge.

## Acceptance Criteria
- [x] `npm run audit:brand` passes.
- [x] Setup docs describe `DATABASE_URL`, `BETTER_AUTH_SECRET`, the provider variables, `STRAP_VAULT_SECRET`, and `STRAP_MAINTENANCE_SECRET`.
- [x] The context pack contains no Supabase claims except historical records.

## Traceability
- Story: US-005
- Acceptance criteria: AC-005

## Technical Notes
Follow the unslop style. No em dashes in product copy.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:48:27Z: Setup/security/context and source docs updated. Brand audit passes. Generated wiki refresh remains its normal post-merge workflow.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
