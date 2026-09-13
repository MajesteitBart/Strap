---
id: WS-A
name: WS-A Library and device sync
owner: MajesteitBart
status: active
created: 2026-09-13T13:38:18Z
updated: 2026-09-13T13:38:19Z
operating_mode: feature
---

# Workstream: WS-A Library and device sync

## Objective
Deliver a profile-scoped shared skill library, portable device sync, and agent discovery through the existing MCP connection.

## Owned Files/Areas
Shared skill schema and APIs, `/skills` UI, MCP tool integration, `packages/strap/src/skills`, public setup documentation, and feature verification. One implementer owns this stream; no subagents.

## Dependencies
Existing profile membership, Supabase session authentication, scoped MCP grants, and CLI OAuth transport. Deployment follows local migration verification and exact-head PR review.

## Risks
Concurrent publication, local/remote conflicts, Windows path semantics, supporting-file integrity, profile changes during requests, and npm release authentication.

## Handoff Criteria
Acceptance evidence is recorded under updates. Tests and deployment must demonstrate two-device sync and authorized agent discovery; release gates remain open until review, migration, production, and npm publication are verified.
