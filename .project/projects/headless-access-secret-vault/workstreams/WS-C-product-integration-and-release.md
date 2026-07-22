---
id: WS-C
name: WS-C Product Integration and Release
owner: MajesteitBart
status: done
created: 2026-07-22T05:40:01Z
updated: 2026-07-22T08:39:47Z
operating_mode: multi-stream
---

# Workstream: WS-C Product Integration and Release

## Objective

Make the new capabilities understandable and operable in the signed-in product, remove obsolete next-forge bootstrap state, and produce release-quality verification and PR evidence.

## Owned Files/Areas

- Connections headless-access card/dialog and setup guidance.
- New Vault screen, signed-in route, navigation, and client-side secret lifecycle.
- `BOOTSTRAP.md`, current project context, Delano contracts, and next-forge skill removal.
- Repository-wide quality gates, UI smoke evidence, commit, push, and draft PR.

## Dependencies

- WS-A management routes and credential response contracts.
- WS-B Vault routes and authorization contract.
- Product shell, design primitives, and existing Creed switcher context.

## Risks

- Secret values remain in React state or clipboard guidance longer than intended.
- UI implies recoverability for one-time credentials.
- Navigation or server loading regresses marketing-route state isolation.
- Documentation drifts from implemented endpoint or role behavior.

## Handoff Criteria

- A user can complete key create/copy/revoke and Vault create/reveal/update/delete flows with clear one-time and expiry language.
- Reveal state automatically clears and sensitive fetches bypass caches.
- Current repo documentation no longer claims next-forge is installed or required.
- Migration reset, tests, typecheck, lint, build, Delano validation, and UI smoke checks pass or have explicit blocker evidence.
- Changes are committed and pushed on the feature branch with a draft PR to `main`.
