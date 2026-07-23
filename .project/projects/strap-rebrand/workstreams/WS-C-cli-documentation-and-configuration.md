---
id: WS-C
name: WS-C CLI Documentation and Configuration
owner: MajesteitBart
status: done
created: 2026-07-23T02:05:37Z
updated: 2026-07-23T02:58:09Z
operating_mode: multi-stream
---

# Workstream: WS-C CLI Documentation and Configuration

## Objective

Deliver the new Strap CLI identity and make repository/operator documentation and deployment configuration match the rebrand.

## Owned Files/Areas

- Separate `@bvdm/strap` package and `strap` executable.
- README, contribution/security/operator docs, `.env.example`, and durable project context.
- Release instructions for domain and package cutover.

## Dependencies

- WS-B agent/MCP contract and compatibility decisions.
- Existing user-authored Strap CLI workstream material remains preserved.

## Risks

- Package publication is confused with local implementation readiness.
- Documentation overstates external deployment or removes legacy guidance too soon.

## Handoff Criteria

- CLI package tests, typecheck, pack, and local install smoke pass.
- Documentation consistently explains Strap, `strap.md`, `strap.bvdm.ai`, and legacy compatibility.
- External mutations remain explicitly gated.
