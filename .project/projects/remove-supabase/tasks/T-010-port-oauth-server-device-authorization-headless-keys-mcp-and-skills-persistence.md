---
id: T-010
name: Port OAuth server, device authorization, headless keys, MCP, and skills persistence
status: done
workstream: WS-C
created: 2026-09-13T17:49:31Z
updated: 2026-09-13T21:47:30Z
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

# Task: Port OAuth server, device authorization, headless keys, MCP, and skills persistence

## Description
Port `lib/oauth.ts`, `lib/oauth-device.ts`, `lib/headless-access.ts`, `lib/skills.ts`, `app/mcp/route.ts`, `/authorize`, `/token`, `/register`, `/revoke`, `/device/*`, `/api/creed/*`, `/api/strap/*`, and the headless access and vault routes. Keep the two device-authorization SQL functions and the skill functions, called through Drizzle `sql`, unless a transaction port is simpler.

## Acceptance Criteria
- [x] Existing hashed OAuth tokens and `creed_key_` and `strap_key_` credentials resolve to the same grant and mode.
- [x] The device flow, headless keys, and skills publish and read pass the integration tests.
- [x] `tests/strap-agent-contract.test.ts` and `tests/strap-protocol-compatibility.test.ts` are unchanged and green.

## Traceability
- Story: US-003
- Acceptance criteria: AC-002

## Technical Notes
The MCP route's admin client casts become repository calls with an explicit service context. Rate limiting and audit behaviour stay as they are.

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-09-13T21:47:30Z: Local implementation verified: 283 tests, browser/API/MCP and import rehearsals; see updates/2026-09-13-local-runtime-verified.md.
- 2026-09-13: Planned from the Supabase surface inventory.

- 2026-09-13: Local implementation and checks verified; see updates/2026-09-13-local-runtime-verified.md. External provider/production checks are retained in T-016/T-017.
