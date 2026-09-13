---
name: Runtime dependency security
slug: runtime-security
owner: MajesteitBart
status: complete
created: 2026-09-13T13:06:54Z
updated: 2026-09-13T16:38:13Z
outcome: Deploy a patched Next runtime and remove current fixable dependency advisories while preserving app behavior
uncertainty: low
probe_required: false
probe_status: skipped
probe_decision_rationale: Vendor fixes and regression gates provide a direct verification path
operating_mode: patch
---

# Spec: Runtime dependency security

## Executive Summary

Patch the application runtime and compatible dependencies after the September 13 release check identified newly published critical and high advisories.

## Problem and Users

Next 16.2.11 is affected by GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4. This repository runs on Windows during development and enables AVIF optimization. The editor and transport dependency graph also contains fixable advisories.

## Outcome and Success Metrics

No fixable critical or high audit findings remain after compatible upgrades. Existing app tests, typing, lint, production build and deployed route/image checks pass.

## User Stories
- US-001: As an operator, I want patched runtime dependencies so existing Strap workflows remain usable without the known vulnerable versions.

## Acceptance Scenarios
- AC-001: Dependency audit, application regression gates and production deployment verification pass for the reviewed update.

## Scope
### In Scope
- Pinned Next runtime and matching tooling; compatible fixes for vulnerable installed dependencies; release verification and context.
### Out of Scope
- New product features, schema changes, authentication redesign and unrelated major dependency upgrades.

## Functional Requirements

## Non-Functional Requirements

## Assumptions
- Project scope and ownership remain accurate as execution starts.

## Needs Clarification
- None recorded at creation.

## Hypotheses and Unknowns

## Touchpoints to Exercise
- Rich-text conversion and editor initialization, public/auth routes, private-route denial, health, discovery and image optimization.

## Probe Findings

## Footguns Discovered

## Remaining Unknowns

## Dependencies

## Approval Notes
- The user authorized finishing the project into a usable state and carrying verified fixes through PR and merge. This is a maintenance repair within that scope.
