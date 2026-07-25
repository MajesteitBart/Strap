---
name: Strap Visual Redesign
slug: strap-visual-redesign
owner: MajesteitBart
status: active
created: 2026-07-24T21:18:45Z
updated: 2026-07-25T00:12:52Z
outcome: Apply a cohesive Strap visual design language across public, authentication, signed-in product, and communication surfaces after the rename-first release.
uncertainty: medium
probe_required: false
probe_status: skipped
probe_decision_rationale: The rename inventory already identifies the affected surfaces, and the user approved the existing /home worktable system as the reference for the public docs redesign on 2026-07-25.
operating_mode: multi-stream
---

# Spec: Strap Visual Redesign

## Executive Summary

Apply a cohesive Strap visual language after the rename-first release. This
contract preserves the design work identified by the rebrand inventory without
mixing it into the compatibility-sensitive naming migration.

## Problem and Users

The rename establishes one product identity, but several surfaces still inherit
the previous visual system. Visitors, Personal Strap users, Company Strap users,
and maintainers need an intentional system spanning marketing, documentation,
authentication, product UI, email, assets, and motion.

## Outcome and Success Metrics

- One approved Strap visual system is documented and implemented across every
  in-scope surface.
- Public and signed-in routes remain responsive, accessible, and behaviorally
  equivalent while their presentation changes.
- Shared primitives replace local styling forks where doing so improves
  consistency.
- Desktop, mobile, keyboard, reduced-motion, contrast, and production gates pass
  with captured evidence.

## User Stories

- US-001: As a visitor, I want every Strap page to feel like one product.
- US-002: As a user, I want public, authentication, and signed-in flows to retain
  clear hierarchy and accessibility across devices.
- US-003: As a maintainer, I want reusable design primitives rather than
  route-specific visual fixes.

## Acceptance Scenarios

- AC-001: Given an approved visual direction, when public and signed-in routes
  render at desktop and mobile widths, then they use the same Strap typography,
  color, spacing, border, asset, and motion language.
- AC-002: Given existing product behavior and permissions, when the visual
  redesign ships, then those contracts remain unchanged.
- AC-003: Given keyboard navigation, reduced motion, and common contrast checks,
  when the redesigned surfaces are exercised, then they remain accessible.

## Scope

### In Scope

- Public site chrome, docs, product pages, Learn, Bench, Changelog, legal
  placeholders, and public error states.
- Authentication, setup, OAuth consent, device authorization, invitations,
  onboarding, and transactional email presentation.
- Personal and Company Strap shell, editor, connections, keys, settings, command
  panel, onboarding, and first-run states.
- Shared UI variants, assets, typography, tokens, motion, responsive behavior,
  accessibility, and browser evidence.

### Out of Scope

- Renaming protocol, database, compatibility, source, or package identifiers.
- Changing product semantics, permissions, persistence, pricing, or roadmap
  claims.
- Removing compatibility aliases retained by the rename-first release.

## Functional Requirements

- FR-001: Begin implementation only after the visual direction is approved.
- FR-002: Build shared primitives before duplicating route-local styling.
- FR-003: Preserve every existing interaction, permission, and data contract.
- FR-004: Cover public, authentication, product, email, and asset surfaces.

## Non-Functional Requirements

- Meet WCAG-informed keyboard, focus, contrast, and reduced-motion expectations.
- Preserve server-component boundaries and marketing-route state isolation.
- Add no dependency without an explicit delivery decision.
- Keep responsive behavior correct from 390px mobile through desktop widths.

## Assumptions

- The rename-first release is complete before this project begins.
- The existing `/home` worktable system is the approved public-site reference:
  warm paper, flat white surfaces, crisp dark borders, persistent resource
  colours, display typography, and compact monospace labels.

## Needs Clarification

- None for the docs slice. The visual reference and lead surface are approved.

## Approved Direction

- Public documentation leads implementation, using `/home` as the reference.
- Other public and signed-in surfaces remain separately scoped and must not be
  treated as redesigned merely because the shared docs chrome has shipped.

## Hypotheses and Unknowns

- A shared token and primitive pass will remove most visual inconsistency without
  structural product changes.
- Email-client constraints may require a reduced version of the web system.

## Touchpoints to Exercise

- All public routes, authentication and authorization routes, onboarding,
  Personal and Company Strap routes, error states, and transactional emails.

## Probe Findings

- The 111-item rename inventory already identifies the affected visual surfaces.
  A separate technical probe is unnecessary until a visual direction is chosen.

## Footguns Discovered

- Visual refactors can accidentally alter focus order, motion preferences,
  responsive navigation, or authenticated-state boundaries.

## Remaining Unknowns

- Approved art direction and reference artifacts.
- Desired rollout order and tolerance for incremental visual inconsistency.

## Dependencies

- Completed `.project/projects/strap-rename-completion/`.
- Approved visual direction from the user.

## Approval Notes

- 2026-07-24: Created as the explicit follow-up to the user's direction:
  rename first, redesign later.
