---
name: Strap Rebrand
status: active
lead: MajesteitBart
created: 2026-07-23T02:02:31Z
updated: 2026-07-23T02:10:45Z
linear_project_id: 
risk_level: high
spec_status_at_plan_time: approved
operating_mode: multi-stream
---

# Delivery Plan: Strap Rebrand

## What Changed After Probe

No prototype probe is required. Repository and brand-package research established that the safe implementation is a complete customer-facing rebrand with additive compatibility, not a schema-wide identifier rewrite.

## Technical Context

- Next.js 16 renders static marketing routes separately from authenticated app providers.
- The existing product uses Creed identifiers across UI copy, internal domain modules, Postgres schema, OAuth/MCP contracts, telemetry, local storage, and GitHub sync.
- New headless access and Vault work is present as unrelated user changes and must remain intact.
- A separate Strap CLI contract already exists in the headless-access project as user-authored worktree state.

## Architecture Decisions

- Introduce Strap as the canonical public brand and `strap.md` as the canonical new file while retaining internal Creed identifiers needed for compatibility.
- Build the new home page from the supplied worktable system using repository-native React/Tailwind and local brand assets.
- Centralize public brand/domain/file constants, then update customer-visible callers without renaming stable persistence contracts.
- Make GitHub filename migration read-compatible: `strap.md` first, `creed.md` fallback; new writes target `strap.md`.
- Prefer additive agent/CLI aliases and documentation over breaking route or tool renames.
- Preserve the legacy `creed.md` MCP/OAuth origin as a functioning compatibility endpoint; do not rely on a generic redirect for protocol clients.
- Honor stored GitHub paths for existing integrations. Only new configurations default to `strap.md`, and migration never creates two silently divergent profile files.
- Treat actual DNS, deployment, npm publish, and removal of legacy surfaces as operator-controlled release steps.

## Policy and Contract Checks

- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map

- `spec.md`: Approved brand, compatibility, and release contract.
- `plan.md`: Delivery sequence, boundaries, and verification strategy.
- `decisions.md`: Durable naming and compatibility decisions.
- `research/brand-and-compatibility/`: Source evidence and option analysis.
- `workstreams/`: Brand foundation, product/agent migration, CLI/docs/configuration, and quality/closeout.
- `tasks/`: Atomic implementation and verification units.

## Complexity Exceptions

- The customer-visible rename spans many files, but internal identifiers are deliberately excluded to avoid a high-risk cosmetic migration.
- Home-page implementation is isolated in a new Strap-specific component rather than rewriting the very large legacy marketing composition in place.

## Probe-Driven Architecture Changes

- None. Research intake replaced a prototype because the uncertainty was naming and compatibility policy, not technical feasibility.

## Workstream Design

- WS-A, Brand Foundation and Public Website: brand constants/assets, home page, public chrome, metadata, SEO, and domain-ready configuration.
- WS-B, Product, File, and Agent Surfaces: visible app copy, onboarding/auth/email, `strap.md`, GitHub fallback, prompts, MCP/API compatibility.
- WS-C, CLI and Documentation: implement `@bvdm/strap` from the existing headless-access WS-D contract without rewriting that user-authored contract, then update command/help/package metadata, public docs, and repository/operator documentation.
- WS-D, Quality and Release Readiness: checked-in brand-audit script and allowlist, focused/full checks, Fable review, computer-use browser testing, evidence and closeout.

## Milestone Strategy

1. Contract gate: research folded forward and Fable approves the Spec/Plan or blockers are incorporated.
2. Brand gate: canonical assets/constants and the new public website render responsively.
3. Compatibility gate: app, filename, GitHub, agent, and CLI behavior pass focused tests without legacy regression.
4. Quality gate: full checks, Fable diff review, browser testing, and brand audit pass.
5. Release gate: deployment/domain/npm actions are listed and executed only with explicit approval; `creed.md` MCP/OAuth issuer compatibility is proven before any origin change.

## Rollout Strategy

- Ship code with Strap as the default visible identity and compatibility fallbacks for prior Creed integrations.
- Configure `NEXT_PUBLIC_SITE_URL=https://strap.bvdm.ai` in the deployment environment during the approved release step.
- Keep the `creed.md` MCP/OAuth origin and legacy endpoints/files functional for the compatibility window and document their status.
- Publish `@bvdm/strap` only after local pack/install verification and explicit operator approval.
- Configure and verify any Strap transactional-email sender domain, SPF, DKIM, and provider identity only during the approved release step.

## Test Strategy

- Focused tests for brand constants, filename selection/fallback, metadata, prompts, MCP discovery/aliases, and CLI contract.
- Checked-in `scripts/check-strap-rebrand.ts` scan plus a reviewed allowlist that cites stable schema, module, event, storage, route, and CSS identifier categories from D-004. The gate passes only when every remaining non-allowlisted brand occurrence is explicitly classified or removed.
- Root `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, and `npm run build`.
- CLI package test, typecheck, pack, and clean local install smoke.
- Fable read-only review of the approved plan and final diff.
- Computer-use browser smoke at desktop and mobile widths across public and available authenticated routes, recording console/network results and screenshots.

## Rollback Strategy

- Revert the customer-facing commit set while leaving database and credentials untouched.
- Restore Creed public constants and default filename; keep dual-read filename logic because it is backward-compatible.
- Domain/DNS and npm publication, if later approved, use their own provider rollback/version procedures.

## Remaining Delivery Risks

- Long-tail copy can remain in infrequently visited states, email templates, or generated marketing articles.
- Authenticated Company states may need fixture access for complete GUI coverage.
- External domain and package availability cannot be proven by local build alone.
