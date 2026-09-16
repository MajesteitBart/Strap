---
id: T-019
name: Remove Supabase dependencies, configuration, CSP entries, and skills
status: done
workstream: WS-F
created: 2026-09-13T17:49:34Z
updated: 2026-09-13T21:48:27Z
linear_issue_id:
github_issue:
github_pr:
depends_on: [T-011, T-012, T-013, T-014, T-015]
conflicts_with: []
parallel: true
priority: medium
estimate: M
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Remove Supabase dependencies, configuration, CSP entries, and skills

## Description
Remove `@supabase/ssr` and `@supabase/supabase-js`, the `supabase/` directory, `*.supabase.co` entries in `next.config.ts` and `.netlify/netlify.toml`, `.agents/skills/supabase` with its `.claude/skills` link, the `skills-lock.json` entry, the Supabase paths in `scripts/strap-rebrand-allowlist.json`, and the Supabase-based verification scripts. Rewrite `scripts/verify-legacy-deletion.mjs` and `scripts/verify-company-provisioning.mjs` against Better Auth and the database.

## Acceptance Criteria
- [x] No active Supabase SDK, client, provider configuration or CSP dependency remains. Historical records, generated OpenWiki, import compatibility, the preserved agent-contract example and the general Postgres skill may retain the name.
- [x] `npm run build` passes with the dependencies removed.
- [x] `.agents/skills/supabase-postgres-best-practices` stays, since it applies to plain Postgres.

## Traceability
- Story: US-005
- Acceptance criteria: AC-005

## Technical Notes
The import uses direct Postgres and does not depend on the removed SDK. Cleanup is safe before production cutover. .netlify is ignored generated output; its configuration regenerates from next.config.ts.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:48:27Z: SDK, clients, old migrations, provider skill and callback link removed. Build and dependency audit pass.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
