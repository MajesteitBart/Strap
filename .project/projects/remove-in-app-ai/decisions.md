---
name: Remove in-app AI
slug: remove-in-app-ai
owner: maintainer
created: 2026-09-16T09:28:21Z
updated: 2026-09-16T09:28:21Z
---

# Decisions: Remove in-app AI

## Active Decisions
- Remove model execution, AI controls and provider configuration together. Keep deterministic search and manual editing.
- Preserve external-agent permissions, proposals and approval. Keep historical quality-report reads for MCP compatibility without generating new reports.
- Retain database history and encrypted legacy credentials without runtime consumers. No destructive migration or hosted credential changes are part of this task.

## Superseded Decisions
- None.

## Open Decision Questions
- None recorded at creation.
