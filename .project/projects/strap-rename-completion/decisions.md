---
name: Strap Rename Completion
slug: strap-rename-completion
owner: MajesteitBart
created: 2026-07-24T19:56:24Z
updated: 2026-07-24T19:56:24Z
---

# Decisions: Strap Rename Completion

## Active Decisions

- D-001: Rename first and preserve current visual behavior. Redesign is a separate future delivery.
- D-002: Strap is canonical across active product, protocol, package, source, repository, and documentation surfaces.
- D-003: Retained Creed identifiers must be explicit compatibility or immutable historical truth, not unclassified leftovers.
- D-004: Protocol, credential, storage, and schema migrations are additive and share existing authorization paths.
- D-005: Parallel workers own non-overlapping files; broad path moves happen only after parallel handoff.
- D-006: The user's 2026-07-24 instruction is explicit approval to rename the GitHub repository and publish `@bvdm/strap` after local quality gates.

## Superseded Decisions

- `strap-rebrand` D-004 is superseded where it froze internal Creed identifiers categorically. This project permits scoped, forward-compatible renames required by the inventory.
- `strap-rebrand` D-007 is satisfied by the user's explicit execution instruction for the inventory's GitHub and npm release tasks.
- `strap-rebrand` D-012 is superseded where it rejected additive Strap protocol aliases. Canonical Strap aliases may be added while legacy names remain compatible.

## Open Decision Questions

- None. Credential or fixture absence is an execution blocker, not a product decision.
