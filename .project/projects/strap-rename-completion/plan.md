---
name: Strap Rename Completion
status: active
lead: MajesteitBart
created: 2026-07-24T19:56:24Z
updated: 2026-07-24T23:05:05Z
linear_project_id:
risk_level: high
spec_status_at_plan_time: planned
operating_mode: multi-stream
---

# Delivery Plan: Strap Rename Completion

## What Changed After Probe

No new probe is required. The exhaustive Creed-remnant inventory replaces discovery and the user has approved execution. The earlier design ambiguity is resolved by preserving current visual behavior during the rename and scheduling redesign separately.

## Technical Context

- The work spans Next.js routes and components, strict TypeScript domain modules, Supabase migrations, MCP/OAuth/API contracts, two CLI packages, repository documentation, generated OpenWiki pages, and external GitHub/npm release steps.
- The worktree contains unrelated headless-access and Vault changes that must remain intact.
- Stable deployed identifiers need additive aliases or forward migrations before old names can be retired.

## Architecture Decisions

- Canonical active names become Strap. Retained Creed names are compatibility or immutable historical truth and must be classified.
- Rename user-visible and source identities without changing current visual values.
- Stage broad path/module moves after parallel surface work to avoid shared-worktree conflicts.
- Keep one implementation and authorization path behind protocol aliases.
- Introduce forward-only database migrations and dual-read behavior where stored identity changes.
- Run external release actions only after package and repository quality gates pass.

## Policy and Contract Checks
- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map
- `spec.md`: Approved rename-first outcome and safeguards.
- `plan.md`: Staged multi-stream delivery and integration strategy.
- `workstreams/`: Public, product, repository/CLI, protocol/data, and quality/release ownership.
- `tasks/`: Eight parallel implementation packets, one staged migration packet, and one integration/quality packet.

## Complexity Exceptions
- Inventory entries remain the atomic evidence units; Delano tasks group non-overlapping file ownership so eight workers can execute safely.

## Probe-Driven Architecture Changes

- None.

## Workstream Design

- WS-A, Public Surfaces: marketing, documentation, auth, legal, public content, theme, assets, and shared primitives.
- WS-B, Product Surfaces: signed-in product copy and component identity while preserving behavior and visuals.
- WS-C, Repository and CLI: repository guidance, scanner, skill/OpenWiki sources, package identity, and release readiness.
- WS-D, Protocol and Data: MCP/API/OAuth/config aliases, internal modules, panel/AI language, migrations, and tests.
- WS-E, Integration and Release: staged path moves, external release actions, exhaustive verification, browser evidence, and closeout.

## Milestone Strategy

- M1: Contract and ownership boundaries validate; eight implementation tasks are ready.
- M2: Parallel file-owned rename packets complete focused checks.
- M3: Staged path/module/schema integration completes with compatibility tests.
- M4: Exhaustive scanner, full application, CLI, migration, agent-contract, and browser gates pass.
- M5: GitHub/npm release steps are verified and delivery closes.

## Rollout Strategy

- Land additive canonical Strap names first.
- Migrate internal callers and new guidance to Strap.
- Retain legacy reads/aliases for deployed clients and stored data.
- Perform external rename/publication after clean local pack/build evidence.

## Test Strategy

- Focused tests per worker-owned surface.
- Root `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, and `npm run build`.
- `packages/strap` and legacy CLI tests/typechecks as applicable.
- Exhaustive tracked-file/path brand scan with reviewed compatibility classifications.
- `npx supabase db reset` for migrations when the local runtime is available.
- MCP/API/OAuth focused tests and two-model agent-contract checks.
- T3 browser smoke for public and available authenticated routes at desktop and mobile widths.
- `delano validate` plus inventory/index integrity.

## Rollback Strategy

- Revert canonical-name callers while leaving additive aliases and migrations in place.
- Keep compatibility paths and stored identifiers readable throughout rollout.
- Use GitHub repository redirect/revert and npm version/deprecation mechanisms for external rollback.

## Remaining Delivery Risks

- Mechanical moves can collide with parallel edits if performed before workstream handoff.
- Existing credentials and stored data require dual-read validation.
- Authenticated browser fixtures, Supabase local runtime, GitHub admin access, or npm credentials may be unavailable.
- The working tree starts dirty, so unrelated user changes must not be included or reverted.
