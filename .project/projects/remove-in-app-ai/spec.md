---
name: Remove in-app AI
slug: remove-in-app-ai
owner: maintainer
status: complete
created: 2026-09-16T09:28:21Z
updated: 2026-09-16T09:51:43Z
outcome: Strap uses connected external agents for feedback without running paid LLM calls in the app
uncertainty: low
probe_required: false
probe_status: skipped
probe_decision_rationale: Probe skipped at creation: scope is assumed low-uncertainty. Update this rationale if uncertainty changes.
operating_mode: feature
---

# Spec: Remove in-app AI

## Executive Summary
Remove in-app LLM execution and use connected agents for profile feedback.

## Problem and Users
Personal and Company users already have agents. A second hosted model adds cost and provider configuration without a necessary role in their review workflow.

## Outcome and Success Metrics
Strap makes no LLM provider calls. Users rely on connected agents for feedback and approve or decline proposals.

## Scope
Follow-up approved on 2026-09-16: remove Nexus visualization and its view toggle. Keep the editor and section-reference chips.
Remove the assistant/Ask/smart-search modes, quality generation and scores, Tab completion, provider settings, usage and BYOK endpoints, and obsolete configuration/copy. Preserve local search, manual editing, external-assistant onboarding, OAuth/MCP, proposal permissions, and historical read-only quality report compatibility. No database deletion, hosted changes, or external tracker writes.

## User Stories
- US-001: As a user, I use my existing connected agent for feedback and review proposals in Strap without configuring a second model provider.

## Acceptance Scenarios
- AC-001: No provider caller, AI endpoint, or AI control remains.
- AC-002: Search, editor, onboarding, Personal/Company permissions and proposal review still work.
- AC-003: Types, lint, production build and regression checks pass.

## Approval Notes
The user explicitly requested removal and a pull from remote main before implementation on 2026-09-16. This contract implements that scope. No probe is needed: existing provider and UI boundaries are directly inspectable.

## Functional Requirements
Remove model generation and configuration. Preserve local navigation and external proposal review in both profile types.

## Non-Functional Requirements
No provider requests or credential exposure. Preserve authentication and section permissions.

## Assumptions
Existing external-agent permission modes remain user-controlled.

## Needs Clarification
None within the requested local implementation.

## Hypotheses and Unknowns
No technical uncertainty requires a prototype.

## Touchpoints to Exercise
Personal editor, keyboard search, settings, mobile layout, Company settings, MCP proposals, approval and rejection.

## Probe Findings
Skipped; source inspection establishes the provider boundaries.

## Footguns Discovered
Generated Next.js route types can retain deleted endpoints. Historical MCP report reads must not import provider execution code.

## Remaining Unknowns
Hosted rollout timing is outside this local change.

## Dependencies
Remote main merged before implementation; local Postgres supports isolated test fixtures.
