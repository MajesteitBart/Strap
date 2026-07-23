---
id: WS-B
name: WS-B Product File and Agent Surfaces
owner: MajesteitBart
status: done
created: 2026-07-23T02:05:37Z
updated: 2026-07-23T02:45:33Z
operating_mode: multi-stream
---

# Workstream: WS-B Product File and Agent Surfaces

## Objective

Rebrand every customer and agent interaction while preserving Personal/Company data, permissions, credentials, and legacy clients.

## Owned Files/Areas

- Authenticated UI, onboarding/auth, email, errors, and connection guidance.
- Export and GitHub sync filename behavior.
- Agent prompts, OAuth consent/device, MCP/API descriptions, and compatibility aliases.

## Dependencies

- WS-A canonical brand/file constants.
- Existing permission, OAuth, MCP, secret, and GitHub round-trip behavior.

## Risks

- Cosmetic renames cross into security or persistence contracts.
- Existing `creed.md` repositories or cached MCP clients break.
- Universal agent instructions change behavior instead of only identity.

## Handoff Criteria

- Visible product and agent surfaces use Strap consistently.
- `strap.md` is canonical and `creed.md` remains readable.
- Focused regression tests prove credentials, permissions, and agent behavior remain bounded.
