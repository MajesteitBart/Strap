---
name: Release automation
slug: release-automation
owner: MajesteitBart
status: active
created: 2026-09-13T09:35:41Z
updated: 2026-09-13T09:35:41Z
outcome: Restore the scheduled OpenWiki update and verify application and CLI pull requests in GitHub Actions.
uncertainty: low
probe_required: false
probe_status: skipped
probe_decision_rationale: The failed run identifies an unset provider and absent repository credential; current package documentation confirms the fix.
operating_mode: patch
---

# Spec: Release automation

## Executive Summary
Restore the scheduled documentation update and make application and CLI verification visible on pull requests.

## Problem and Users
OpenWiki defaults to OpenAI because the workflow does not select OpenRouter. The repository also has no provider secret. The existing automation does not run application verification.

## Outcome and Success Metrics
- A pinned OpenWiki version runs with the explicit OpenRouter provider.
- Missing credentials fail with a clear configuration error.
- Generated PRs contain only wiki documentation.
- Root and both CLI checks run on PRs and main.
- The repaired workflow is exercised remotely before closure.

## User Stories
- US-001: As a maintainer, I can see release checks and receive current architecture documentation.

## Acceptance Scenarios
- AC-001: A configured update completes without requesting OpenAI credentials.
- AC-002: A PR runs tests, types, lint, brand validation, production build and both CLI suites.

## Scope
### In Scope
GitHub workflow files, secure project credential configuration, release evidence.
### Out of Scope
Branch-protection changes, paid review credits, product behavior and redesign.

## Functional Requirements
Select OpenRouter, pin dependencies/actions, fetch complete Git history, limit runtime, preserve authored instructions and executable configuration.

## Non-Functional Requirements
Never print credentials or include them in source. Do not auto-merge generated documentation.

## Assumptions
The existing deployment OpenRouter key is available for the project's requested documentation automation.

## Needs Clarification
None for implementing the authorized repair.

## Dependencies
GitHub Actions, OpenRouter, and OpenWiki.

## Approval Notes
2026-09-13: User authorized finishing outstanding maintenance, committing, reviewing and merging.
