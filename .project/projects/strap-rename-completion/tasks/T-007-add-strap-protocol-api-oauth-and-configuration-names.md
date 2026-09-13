---
id: T-007
name: Add Strap protocol API OAuth and configuration names
status: done
workstream: WS-D
created: 2026-07-24T20:00:35Z
updated: 2026-07-24T20:17:15Z
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: [app/mcp/route.ts, app/api/creed, app/api/strap, app/api/app, app/authorize/decision, lib/oauth.ts, lib/oauth-device.ts, lib/headless-access-shared.ts, lib/secret-crypto.ts, lib/creed-prompts.ts, lib/creed-data.ts]
parallel: true
priority: high
estimate: XL
operating_mode: multi-stream
story_id:
acceptance_criteria_ids: []
---

# Task: Add Strap protocol API OAuth and configuration names

## Description

Implement inventory R-086 through R-098 in app/mcp, app/api/creed and canonical aliases, OAuth/device routes and libraries, credential prefixes, rate limits, prompts/resources, browser API fields, secret config aliases, and universal agent contract. Use additive compatibility and shared dispatch.

## Acceptance Criteria

- [x] Canonical Strap MCP tools, prompts, resources, HTTP routes, credentials, fields, and configuration names work through shared authorization paths.
- [x] Legacy Creed protocol and credential contracts remain tested and cannot bypass rate limits or permission checks.
- [x] Focused MCP, OAuth, API, agent-contract, and security tests pass.

## Traceability
- Story: none
- Acceptance criteria: none

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-07-24T20:17:15Z: Implemented canonical Strap MCP tools/resources/prompts, /api/strap shared handlers, new Strap credential/OAuth prefixes with legacy lookup, strapId/straps additive browser fields, Strap config precedence, and secret-safe guidance. npm test 175/175, TypeScript, ESLint, production build, and diff check passed. Live credential flows and two-model agent-contract verification remain T-010 gates.

- 2026-07-24T20:01:52Z: Assigned to a medium-effort worker under the documented file boundary.

- 2026-07-24T20:01:52Z: Readiness reviewed: explicit ownership, binary acceptance criteria, no unmet dependencies, and user-approved rename-first execution.
- 2026-07-24T20:00:35Z: Created from .project/templates/task.md by `delano task add`.
