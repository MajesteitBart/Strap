---
id: WS-A
name: WS-A Application and CLI checks
owner: MajesteitBart
status: active
created: 2026-09-13T11:03:32Z
updated: 2026-09-13T11:03:32Z
operating_mode: patch
---

# Workstream: Application and CLI checks

## Objective
Ship deterministic release checks independently of documentation generation.

## Owned Files/Areas
.github/workflows/verify.yml and this delivery contract.

## Dependencies
Existing application and CLI scripts.

## Risks
Keep package installs isolated so web builds do not mask CLI failures.

## Handoff Criteria
All local and remote gates pass, review completes, merge is confirmed.
