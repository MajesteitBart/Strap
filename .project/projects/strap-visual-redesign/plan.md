---
name: Strap Visual Redesign
status: active
lead: MajesteitBart
created: 2026-07-24T21:18:45Z
updated: 2026-07-25T00:12:52Z
linear_project_id:
risk_level: medium
spec_status_at_plan_time: planned
operating_mode: multi-stream
---

# Delivery Plan: Strap Visual Redesign

## What Changed After Probe

The rename inventory supplies the surface map. Execution remains planned until
the user approves visual direction and rollout priority.

## Technical Context

- Next.js public, authentication, onboarding, and signed-in surfaces share
  Tailwind v4 tokens, shadcn primitives, and Motion-based interactions.
- Transactional email and static brand assets require separate rendering
  constraints.
- Product behavior, permissions, persistence, and compatibility contracts are
  outside this visual-only project.

## Architecture Decisions

- Establish shared Strap tokens and component variants before route-specific
  implementation.
- Keep public, authentication, and signed-in streams independently reviewable.
- Treat accessibility and reduced motion as implementation requirements.
- Preserve semantics and behavior during presentation changes.

## Policy and Contract Checks

- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map

- `spec.md`: Approved deferred outcome and safeguards.
- `plan.md`: Staged delivery and quality strategy.
- `workstreams/`: Public, authentication, product, and shared-system ownership.
- `tasks/`: Four implementation packets and one final quality packet.

## Complexity Exceptions

- The shared design-system task precedes final cross-surface quality, while
  individual surfaces may prototype approved primitives in parallel.

## Probe-Driven Architecture Changes

- None until visual direction is approved.

## Workstream Design

- WS-A: Public website and documentation.
- WS-B: Authentication and communication.
- WS-C: Signed-in Personal and Company Strap experience.
- WS-D: Shared design system and final quality.

## Milestone Strategy

- M1: Approve visual direction and representative reference screens.
- M2: Establish shared primitives and implement one pilot surface.
- M3: Complete public, authentication, and signed-in streams.
- M4: Run responsive, accessibility, motion, browser, and production gates.

## Rollout Strategy

- Land reusable primitives first.
- Roll out by independently verifiable surface group.
- Avoid partial route states that mix old and new primitives within one flow.

## Test Strategy

- Focused component and behavior tests per stream.
- Desktop and 390px mobile browser review for every route group.
- Keyboard, focus, reduced-motion, contrast, and email rendering checks.
- Root tests, strict TypeScript, lint, and production build.

## Rollback Strategy

- Keep visual changes isolated from data and protocol migrations.
- Revert surface groups independently while retaining shared primitives that are
  already proven.

## Remaining Delivery Risks

- An unapproved direction would create rework, so implementation remains planned.
- Shared primitives can cause broad regressions without staged browser evidence.
- Email-client rendering differs materially from modern browser CSS.
