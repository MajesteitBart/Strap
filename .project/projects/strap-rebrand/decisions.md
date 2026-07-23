---
name: Strap Rebrand
slug: strap-rebrand
owner: MajesteitBart
created: 2026-07-23T02:02:31Z
updated: 2026-07-23T02:15:00Z
---

# Decisions: Strap Rebrand

## Active Decisions

- D-001: Strap is the canonical public and customer-visible product name; the canonical production origin is `https://strap.bvdm.ai`.
- D-002: The canonical positioning is "Bootstrap your agents with context, skills, and secrets."
- D-003: `strap.md` is the default export and new GitHub sync filename. Existing `creed.md` files remain readable as a compatibility fallback.
- D-004: Stable internal Creed identifiers in database schema, migrations, internal modules, CSS variables, events, storage keys, and legacy APIs remain unchanged unless an additive alias is required for a visible contract.
- D-005: The supplied Strap SVG and merged worktable site are the visual source material. Implementation uses local assets and repository-native code with no new dependency.
- D-006: `@bvdm/strap` and executable `strap` are the new CLI identity. `creed-cli` is not destructively renamed or unpublished in this project.
- D-007: Deployment, DNS changes, npm publication, pushes, and removal of legacy surfaces require explicit operator approval after quality gates.
- D-008: `https://creed.md` remains a functioning MCP/OAuth compatibility origin for already-connected clients during the migration window. Protocol endpoints, issuer/discovery behavior, and callback expectations must continue working; a blanket redirect is not an accepted substitute without client-by-client evidence.
- D-009: Existing GitHub integrations honor their stored explicit profile path. New integrations default to `strap.md`; existing `creed.md` integrations keep using that file until an explicit migration, and Strap never auto-creates a second divergent file.
- D-010: The headless-access project's user-authored WS-D file remains the CLI contract source. The strap-rebrand project owns implementation and verification of that contract but must not overwrite or independently redefine the existing headless-access plan/workstream edits.
- D-011: Rebrand completeness is enforced by a checked-in audit script and reviewed allowlist. Allowed `Creed` occurrences are limited to stable internal schema/migration, module/type, event/audit, storage, compatibility-route/tool, CSS-token, and historical delivery-contract categories; customer-visible copy is not allowlisted.
- D-012: Existing MCP tool names (`read_creed`, `creed_*`), the `creed://profile` resource URI, legacy API routes, credential prefixes, and the `X-Creed-CLI-Agent` header remain compatibility identifiers. New setup uses the logical server name `strap`; the new CLI sends `X-Strap-CLI-Agent`; the server accepts both CLI attribution headers. Additive Strap tool aliases are not introduced because duplicate tools would make discovery ambiguous while providing no new capability.
- D-013: `@bvdm/strap` is a separate, thin live-MCP client for people and coding agents. It keeps the proven `login`, `logout`, `status`, `doctor`, `tools`, `call`, `resources`, `resource`, `prompts`, `prompt`, and `config set server` command contract; uses isolated `STRAP_CONFIG_DIR` / `STRAP_MCP_URL` configuration and `X-Strap-CLI-Agent` attribution; and does not read, migrate, modify, or replace `creed-cli` credentials or package metadata.

## Superseded Decisions

- The Creed.md public brand and `https://creed.md` production origin are superseded by Strap and `https://strap.bvdm.ai`.

## Open Decision Questions

- The duration and eventual removal policy for legacy `creed.md`, `/api/creed/**`, cached MCP tool names, and `creed-cli` will be decided after observed migration adoption.
