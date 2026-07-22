---
id: WS-A
name: WS-A Headless Authentication
owner: MajesteitBart
status: done
created: 2026-07-22T05:40:01Z
updated: 2026-07-22T09:25:38Z
operating_mode: multi-stream
---

# Workstream: WS-A Headless Authentication

## Objective

Deliver revocable, Creed-scoped API-key authentication and an interoperable OAuth device authorization grant without weakening existing OAuth, membership, or section-permission boundaries.

## Owned Files/Areas

- Headless/device portions of the project migration.
- `lib/headless-access.ts`, device helpers, and focused tests.
- `/api/app/headless-access*`, `/device*`, `/token`, OAuth discovery, and `app/mcp/route.ts` integration.
- Headless-access audit action definitions.

## Dependencies

- Existing OAuth client/token schema and helpers.
- Existing Creed membership and section-permission resolution.
- Claude Fable review gate before implementation.

## Risks

- Credential fallback widens access beyond the explicit Creed grant.
- Polling or approval races issue more than one token pair.
- Short user codes are brute-forced without rate and attempt controls.
- Access-mode clamping diverges from existing section permissions.

## Handoff Criteria

- API keys are displayed once, hashed at rest, revocable, optionally expiring, and accepted by MCP only for the bound accessible Creed.
- Normalized credential grants distinguish legacy fallback from explicit grants; revoked/inaccessible company credentials return empty state and never widen to personal.
- Read-mode credentials carry no write/direct token and propose-mode credentials carry no direct token on both personal and company paths; mutation attempts fail at dispatch.
- Device authorization implements request, explicit approval/denial, durable interval enforcement, five-second `slow_down`, expiry, at least 20-symbol/eight-character user-code entropy, ten-attempt invalidation, per-IP verification limits, and atomic single-use token exchange.
- MCP rate limiting stores only a digest of bearer credentials.
- Existing authorization-code/refresh and MCP OAuth tests remain green.
- Focused denial, race, and metadata tests provide evidence.
