---
name: Strap Rename Completion
slug: strap-rename-completion
owner: MajesteitBart
status: complete
created: 2026-07-24T19:56:24Z
updated: 2026-07-24T23:15:17Z
outcome: Complete the 111-item rename-first inventory so active product, website, CLI, protocol, repository, and documentation surfaces use Strap while compatibility remains tested and redesign stays deferred.
uncertainty: medium
probe_required: false
probe_status: skipped
probe_decision_rationale: The completed Creed-remnant inventory establishes the scope and the user approved rename-first execution.
operating_mode: multi-stream
---

# Spec: Strap Rename Completion

## Executive Summary

Execute the repository-wide Creed remnant inventory as a rename-first delivery. Active product, public website, signed-in UI, CLI, protocols, source paths, tests, repository guidance, and generated documentation become Strap-first. Existing users and integrations remain functional through explicit compatibility layers. Visual redesign is a separate follow-up and must not delay the rename.

## Problem and Users

The first Strap rebrand left hundreds of Creed-era references and paths in active repository surfaces. The completed inventory identifies 111 resolution units, but implementation was not part of that audit. Users now need one coherent Strap identity, while maintainers need safe migrations rather than an unreviewed global replacement.

## Outcome and Success Metrics

- All 111 inventory entries are either implemented with evidence or retained only as explicitly tested compatibility or historical truth.
- No unintended customer-visible Creed branding remains.
- New setup, files, protocol discovery, package guidance, source exports, and active repository documentation are Strap-first.
- Compatibility aliases share the existing authorization and persistence paths and do not weaken Personal, Company, OAuth, MCP, API-key, RLS, or Vault boundaries.
- The exhaustive rebrand scanner covers all tracked files and classifies every remaining Creed occurrence and Creed-named path.
- Root tests, strict TypeScript, lint, production build, CLI checks, Delano validation, focused protocol tests, and browser smoke checks pass.

## User Stories

- US-001: As a user, I want every active product surface to say Strap so the product has one identity.
- US-002: As an agent operator, I want Strap-first protocol and CLI names while existing clients remain functional.
- US-003: As a maintainer, I want source paths, modules, tests, docs, and delivery guidance to use Strap without destructive data loss.
- US-004: As a visitor, I want accurate Strap documentation and roadmap labeling without a visual redesign being mixed into the rename.

## Acceptance Scenarios

- AC-001: Given any active customer-visible route or message, when it renders, then unintended Creed branding is absent.
- AC-002: Given a new agent or CLI integration, when it discovers or follows guidance, then canonical names are Strap-first and supported legacy names still resolve.
- AC-003: Given existing stored profile data or credentials, when the migration ships, then access and decryption remain intact.
- AC-004: Given the full tracked repository, when the brand scanner runs, then every Creed string and Creed-named path is removed or explicitly classified.
- AC-005: Given the current visual system, when rename work lands, then behavior and styling remain stable; redesign work is recorded separately.
- AC-006: Given release credentials are available, when local quality gates pass, then the GitHub repository and `@bvdm/strap` package release steps complete and are verified.

## Scope

### In Scope

- All resolution units in `.project/projects/strap-rebrand/inventory/`.
- Public copy, metadata, documentation, auth, email, signed-in product, tests, assets, active comments, paths, modules, CSS namespaces, generated OpenWiki content, and repo-local skill identity.
- Additive Strap protocol, API, resource, prompt, credential, configuration, field, and package naming with compatibility where required.
- Forward-safe schema/data migration where an inventory task requires it.
- GitHub repository rename and `@bvdm/strap` publication after local quality gates, as explicitly approved by the user in this request.
- Evidence, browser verification, exhaustive scanning, and closeout.

### Out of Scope

- Visual redesign beyond the minimum needed to remove old brand naming.
- Changing product semantics, permission lattices, profile-section meaning, or turning Strap into a notes or memory product.
- Removing compatibility needed by deployed users without measured migration evidence.

## Functional Requirements

- FR-001: Treat Strap as canonical in every new and active surface.
- FR-002: Preserve current visual values during this phase; rename tokens and components without aesthetic redesign.
- FR-003: Share implementation and authorization paths between canonical Strap names and retained Creed aliases.
- FR-004: Add forward migrations and read compatibility for stored values; never edit applied migrations destructively.
- FR-005: Preserve the legacy CLI package only as an explicit compatibility artifact.
- FR-006: Regenerate generated documentation from renamed source truth.
- FR-007: Update every inventory entry with completion evidence and status.

## Non-Functional Requirements

- No new runtime dependencies without explicit justification.
- TypeScript remains strict with no `any`; server code adds no `console.log`.
- Product copy contains no em dashes.
- Marketing routes remain isolated from authenticated state.
- Secrets and raw credentials never enter source, logs, evidence, or replies.
- Changes remain reversible and compatibility migrations have rollback paths.

## Assumptions

- The user's instruction to complete all tasks is explicit approval for the listed repository rename and npm publication after local gates pass.
- The existing 111-item inventory is the approved research source and does not require another probe.
- Redesign is intentionally deferred even where an inventory title still uses redesign language.

## Needs Clarification

- None. The user resolved sequencing as rename first and redesign later.

## Hypotheses and Unknowns

- GitHub and npm credentials may or may not be available in the current environment; absence is a hard external blocker, not permission ambiguity.
- A small set of Creed identifiers will remain as tested compatibility or immutable historical migration truth.

## Touchpoints to Exercise

- Public routes, auth and onboarding, signed-in Personal and Company routes, emails, and error states.
- MCP tools/resources/prompts, OAuth and API-key credentials, HTTP aliases, CLI commands, GitHub sync, and configuration fallbacks.
- Root documentation, OpenWiki, repo-local skills, tests, migrations, scanner, and package metadata.

## Probe Findings

- The tracked-file census and 111 task files under the completed rebrand inventory are the controlling evidence.

## Footguns Discovered

- Global replacement can break stored rich text, credential lookup, encryption, OAuth grants, rate limits, RLS, migrations, and cached clients.
- Multiple workers share one worktree, so ownership boundaries and staged path moves are mandatory.
- External release actions must happen after local artifacts are verified.

## Remaining Unknowns

- Availability of authenticated Personal and Company browser fixtures.
- Availability of GitHub repository administration and npm publish credentials.

## Dependencies

- `.project/projects/strap-rebrand/inventory/`
- Existing unrelated headless-access and Vault worktree changes, which must be preserved.
- Current source, migrations, tests, and compatibility origins.

## Approval Notes

- 2026-07-24: The user directed medium-effort subagent delegation and completion of all inventory tasks.
- 2026-07-24: The user set the sequencing rule: rename first, redesign later.
