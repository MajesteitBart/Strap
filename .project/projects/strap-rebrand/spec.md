---
name: Strap Rebrand
slug: strap-rebrand
owner: MajesteitBart
status: complete
created: 2026-07-23T02:02:31Z
updated: 2026-07-24T12:36:02Z
outcome: Replace every customer-facing Creed.md identity with Strap at strap.bvdm.ai, ship strap.md and Strap-compatible agent/CLI surfaces, and preserve existing data and integration compatibility.
uncertainty: medium
probe_required: false
probe_status: skipped
probe_decision_rationale: The supplied Strap brand package and merged website establish the visual direction; repository inspection is sufficient to define compatibility boundaries.
operating_mode: multi-stream
---

# Spec: Strap Rebrand

## Executive Summary

Rebrand the product formerly presented as Creed.md to Strap, with the positioning "Bootstrap your agents with context, skills, and secrets." The public website moves to `https://strap.bvdm.ai`, the portable profile becomes `strap.md`, and every customer-visible web, agent, CLI, documentation, metadata, email, and export surface adopts the Strap name and supplied visual system. Existing persistence identifiers and compatibility endpoints remain stable so the rebrand does not require a risky data migration or break installed clients.

## Problem and Users

The current Creed.md name describes only the personal context file, while the shipped product now also manages agent connections, reusable access patterns, headless credentials, and a secret vault. The Strap brand and supplied site concept describe the broader job: pack the context, skills, and secrets an agent needs, then equip it consistently.

Primary users are individual and company operators connecting AI agents, developers using the CLI or MCP/API surface, and visitors evaluating the product on the public website.

## Outcome and Success Metrics

- All customer-facing surfaces identify the product as Strap and use `strap.bvdm.ai` as the canonical production origin.
- The home page implements the supplied Strap worktable visual system and leads with the approved positioning.
- Exports and new GitHub sync defaults use `strap.md`; existing `creed.md` repositories remain readable through compatibility fallback.
- New agent-facing discovery, prompts, and CLI guidance use Strap naming without invalidating existing credentials or legacy endpoint/tool clients.
- The separate CLI package is `@bvdm/strap` with executable `strap`; `creed-cli` remains a compatibility artifact unless explicitly retired later.
- Root tests, CLI tests, strict TypeScript, lint, production build, Delano validation, Fable review, and browser testing pass with no critical defects.

## User Stories

- US-001: As a visitor, I want a clear Strap website so I understand that it bootstraps agents with context, skills, and secrets.
- US-002: As a Strap user, I want the app, emails, onboarding, exports, and integrations to use one consistent name and identity.
- US-003: As a GitHub sync user, I want `strap.md` to be the canonical new filename without losing access to an existing `creed.md` file.
- US-004: As an agent operator, I want Strap-branded MCP, API, prompts, and CLI guidance while my existing credentials and integrations continue working.
- US-005: As an operator, I want the deployed configuration and metadata to point at `strap.bvdm.ai` without exposing secrets or changing production state without approval.

## Acceptance Scenarios

- AC-001: Given a signed-out visitor, when they open `/home`, then the page uses the supplied Strap logo, palette, typography, worktable composition, approved positioning, responsive layouts, and no Creed customer copy.
- AC-002: Given any public or authenticated UI route, when visible brand copy is rendered, then it says Strap or strap.md and contains no unintended Creed brand references.
- AC-003: Given a user exporting or configuring new GitHub sync, when a filename is selected automatically, then it is `strap.md`.
- AC-004: Given an existing GitHub integration containing only `creed.md`, when the user previews a pull, then the legacy file remains discoverable and can be imported without data loss.
- AC-005: Given an existing OAuth, API key, MCP, database, local-storage, or telemetry identifier, when the rebrand ships, then it continues to function unless a tested additive Strap alias replaces the customer-visible path.
- AC-006: Given a new CLI user, when package and command help are inspected, then `@bvdm/strap` and `strap` are the primary identity and use the live MCP surface.
- AC-007: Given search, social, robots, structured data, legal, README, and app metadata, when inspected, then Strap and `https://strap.bvdm.ai` are canonical.
- AC-008: Given desktop and mobile browser testing, when public and signed-in smoke routes are exercised, then navigation, focus, contrast, responsive composition, auth boundaries, console, and network behavior remain coherent.

## Scope

### In Scope

- Supplied Strap logo, palette, typography, homepage direction, and positioning.
- Public-site chrome, metadata, structured data, legal and marketing copy, learn content, README, and environment examples.
- Customer-visible authenticated app, onboarding, auth, email, connection, vault, settings, export, and GitHub-sync naming.
- `strap.md` as the new canonical portable file with read compatibility for `creed.md`.
- Additive Strap naming for MCP/API/CLI surfaces where externally visible, with legacy compatibility preserved.
- Package and deployment configuration required to serve from `strap.bvdm.ai`.
- Delano evidence, Fable review, and computer-use browser verification.

### Out of Scope

- Renaming Postgres tables, columns, RLS helpers, migrations, audit action keys, internal TypeScript modules, CSS variables, or local-storage keys solely for cosmetics.
- Deleting `/api/creed/**`, legacy MCP tool names, old package artifacts, or existing `creed.md` support.
- Changing Personal/Company permissions, profile section semantics, secret authorization, OAuth grants, or product data.
- DNS, Vercel, npm publication, GitHub pushes, or other external mutations without explicit operator approval.

## Functional Requirements

- FR-001: Use the supplied Strap SVG as the canonical wordmark and derive favicon/social assets without adding a runtime dependency.
- FR-002: Implement the approved strap line exactly: "Bootstrap your agents with context, skills, and secrets."
- FR-003: Preserve marketing-route state isolation and the root static-layout boundary.
- FR-004: Centralize new public brand constants where practical so metadata, copy, and URLs do not drift.
- FR-005: Default all new exports and GitHub pushes to `strap.md`; pull checks `strap.md` first and falls back to `creed.md` only when the canonical file is absent.
- FR-005a: Honor an existing integration's explicit GitHub path. New integrations default to `strap.md`; an existing integration configured for `creed.md` continues reading and writing that path until the user explicitly migrates, and the application never creates a second divergent profile file automatically.
- FR-006: Keep legacy OAuth, API, MCP, database, event, storage, and routing identifiers operational. New aliases must share the existing authorization and implementation path rather than fork security logic.
- FR-006a: Keep `https://creed.md/mcp` and its OAuth issuer, discovery, authorization, token, registration, device, and callback behavior operational for already-connected clients throughout the compatibility window. Redirect-only behavior is insufficient unless verified for every supported client.
- FR-007: Keep secret values out of source, logs, browser artifacts, Delano evidence, and public pages.
- FR-008: Update public documentation and in-product setup instructions to `strap.bvdm.ai`, `@bvdm/strap`, and `strap` where those are the new contract.

## Non-Functional Requirements

- No new runtime dependencies.
- TypeScript remains strict with no `any`; no new `console.log`.
- Product copy contains no em dashes.
- Motion respects reduced-motion and uses the repository easing/duration guidance.
- Customer-visible rebrand coverage is checked mechanically in addition to browser review.
- Compatibility changes are additive and rollbackable.

## Assumptions

- The supplied HTML and SVG are approved brand direction, while the user-provided strap line is the authoritative hero positioning.
- `strap.bvdm.ai` will be configured by the operator after code verification; this project prepares and verifies the application but does not mutate DNS or deployment state without approval.
- Internal `Creed` domain types may remain until a dedicated migration is justified; visible references must not leak from those identifiers.

## Needs Clarification

- External publication and domain cutover require a separate operator-approved step after local quality gates.

## Hypotheses and Unknowns

- A compatibility-first filename change can cover existing GitHub repositories without a schema change.
- MCP tool-name aliases may be unnecessary if the protocol presents neutral action titles; source inspection and Fable review will decide.
- The existing authenticated product visual system can retain internal CSS tokens while adopting Strap brand assets and copy.

## Touchpoints to Exercise

- Public: `/home`, `/docs`, `/learn`, `/pricing`, `/stack`, `/privacy`, `/terms`, `/login`, `/signup`.
- Authenticated: `/file`, `/connections`, `/vault`, `/settings`, Personal/Company switching, export, GitHub pull/push copy.
- Agent: OAuth consent/device screens, MCP `serverInfo` name, discovery/tools/prompts/resources, legacy-origin behavior, `/api/creed/**` compatibility, CLI help/package tests.
- Metadata: root layout, JSON-LD, robots, `llms.txt`, social imagery, favicon, README, `.env.example`.

## Probe Findings

- The supplied merged site defines a flat, bordered worktable chassis with resource colors for context, skills, keys, environments, and agents.
- The repository contains about 300 files with Creed brand text, but many occurrences are stable internal identifiers and should not be mechanically renamed.
- Existing user work already records `@bvdm/strap` as a separate package and `strap` executable, so this project adopts that contract rather than mutating `creed-cli` in place.

## Footguns Discovered

- Global find-and-replace would break database, route, event, storage, and test contracts.
- Switching GitHub sync to `strap.md` without fallback would strand existing files.
- Renaming MCP tools without aliases could break clients that cache names.
- Marketing changes must not reintroduce authenticated state loading.

## Remaining Unknowns

- Whether deployment access and DNS ownership are available for the final cutover.
- Whether all signed-in Personal and Company test fixtures are available for GUI smoke testing.
- Whether the supplied brand package's provenance permits vendoring; the operator-supplied handoff is treated as approved project material unless contrary evidence appears.

## Dependencies

- Existing headless-access and Vault worktree changes remain preserved.
- Supplied files in the external Strap handoff folder.
- Fable review before implementation and after the final diff.
- Computer-use access to a running local or preview build for browser verification.

## Approval Notes

- 2026-07-23: User explicitly requested the full Creed.md to Strap rebrand, supplied the canonical domain and positioning, directed inspection of the Strap handoff, and requested Delano, Fable, and computer-use verification. This instruction approves the scoped compatibility-first spec for execution; external publication remains separately gated.
