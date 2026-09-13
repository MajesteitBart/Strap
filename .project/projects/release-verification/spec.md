---
name: Release verification
slug: release-verification
owner: MajesteitBart
status: complete
created: 2026-09-13T11:02:57Z
updated: 2026-09-13T11:24:20Z
outcome: Run application and both CLI quality gates on pull requests and main without depending on AI documentation generation.
uncertainty: low
probe_required: false
probe_status: skipped
probe_decision_rationale: Extract already-tested release checks from the provider-blocked automation branch.
operating_mode: patch
---

# Spec: Release verification

## Executive Summary
Make application and CLI checks visible on every pull request and main push.

## Problem and Users
The repository has deployment previews but no application or CLI test workflow. Documentation generation currently depends on an exhausted external model quota.

## Outcome and Success Metrics
Application tests, strict types, lint, brand audit and production build run alongside isolated checks for both CLI packages. A failed gate fails the workflow.

## User Stories
- US-001: As the maintainer, I can assess code readiness without waiting for AI documentation generation.

## Acceptance Scenarios
- AC-001: Pull requests and main pushes run all three jobs; each CLI also runs its package dry run.

## Scope
### In Scope
The Verify workflow and its delivery record.
### Out of Scope
OpenWiki execution, paid provider configuration and product behavior.

## Functional Requirements
Node 22, lockfile installs, read-only repository permissions, bounded jobs and superseded-run cancellation.

## Non-Functional Requirements
No secrets are needed for these checks. CLI packages retain independent dependencies and type checks.

## Dependencies
GitHub Actions and the existing package manifests.

## Approval Notes
The user authorized finishing maintenance and the commit-to-merge workflow. This extracts already-tested CI from PR 8 while its provider-dependent acceptance remains open.
