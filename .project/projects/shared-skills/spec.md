---
name: Shared skills
slug: shared-skills
owner: MajesteitBart
status: complete
created: 2026-09-13T13:38:18Z
updated: 2026-09-13T16:27:12Z
outcome: Publish a skill once, sync it safely to two devices, and discover it from a profile-scoped agent connection.
uncertainty: medium
probe_required: false
probe_status: skipped
probe_decision_rationale: Existing MCP, profile grants, and standard skill bundles provide established building blocks; verify concurrency and filesystem safety with executable tests.
operating_mode: feature
---

# Spec: Shared skills

## Executive Summary
Strap will host reusable Agent Skills bundles within Personal and Company profiles. Users publish once, sync across devices, and let connected agents discover and read shared workflows.

## Problem and Users
Skills currently exist only in local agent environments. Strap advertises them as roadmap. The user explicitly requested hosted skills, device sync, and shared agent onboarding on 2026-09-13.

## Outcome and Success Metrics
Publish a standard skill with supporting files from device A, retrieve it on device B, edit and sync it back, and read it through a profile-scoped MCP connection. Conflicting edits, revoked membership, and unsafe filesystem paths fail without losing existing work.

## User Stories
- US-001: As a Personal user, I manage one skill library across my devices.
- US-002: As a Company admin, I publish workflows that members and their agents can use.
- US-003: As a connected agent, I discover metadata before loading relevant instructions and supporting files.

## Acceptance Scenarios
- AC-001: Import, create, edit, archive, download, and restore bundles in /skills, preserving binary assets and scripts.
- AC-002: A second device pulls the same bytes. Subsequent sync reconciles one-sided edits and rejects divergent edits.
- AC-003: Owners/admins publish; members read. Read-only and proposal-only agent grants cannot publish, and no credential crosses its profile grant.
- AC-004: Symlinks, traversal, credential paths, stale revisions, and partial failures preserve local files and published versions.
- AC-005: New agent onboarding exposes skill discovery and readable, truthful setup commands.

## Scope
### In Scope
Profile libraries, 100 skills per profile, 128 files and 2 MiB per skill, up to 20 complete versions within a 64 MiB profile storage budget, browser editor/import/export, MCP discovery/read/export/publication, CLI push/pull/sync and dry-run, Codex and Claude directory targets.
### Out of Scope
Public marketplace, remote URL ingestion, background daemons, skill execution, dependency installation, per-agent manifests, named environments, section policy changes, and importing local credentials or the maintainer's entire skill collection automatically.

## Functional Requirements
Use standard SKILL.md YAML frontmatter. Preserve all uploaded bytes and executable metadata. Browser folder imports cannot read Unix executable flags and require explicit review before publishing; CLI and JSON imports preserve them. Oldest history is pruned to meet the encoded storage budget, preserving current revisions. If current data cannot fit, the publication and pruning roll back together. New names must be portable across Windows and Unix. Archive moves unchanged managed device installations to recoverable backups on next sync. Each local directory binds one server and profile. Existing skills outside that binding require explicit publication or conflict resolution.

## Non-Functional Requirements
No service credentials in clients, bundles, logs, or commits. SQL authorization checks live membership within the transaction. Publication is serialized and revision-checked. No scripts execute during sync. Server requests and bundle parsing are bounded.

## Assumptions
Standard .agents/skills and .claude/skills directories cover initial agent onboarding. Device sync is explicit and user initiated. Company member section overrides do not govern this independent resource library; skill administration follows owner/admin roles.

## Needs Clarification
None required to implement the requested first release.

## Hypotheses and Unknowns
Validate real MCP interaction, browser import/editor states, and packaged CLI installation before release. npm publication may require maintainer authentication.

## Touchpoints to Exercise
Supabase migrations and RPCs; /api/app/skills; /mcp; /skills; /connections; public resource status; packages/strap; legacy CLI compatibility.

## Probe Findings
Current source confirms no existing hosted skills implementation. Reuse current profile grants and service-role RPC patterns; no separate workspace identity is needed.

## Footguns Discovered
Windows reserved names, case-folded path collisions, symlinked skill directories, local/remote divergent edits, and profile switches during fetches require explicit handling.

## Remaining Unknowns
Deployment and package publication readiness are verified in T-004, without assuming a release from local tests alone.

## Dependencies
Existing Supabase profile/membership tables and OAuth/headless grant resolver. Pinned yaml 2.9.1 parses standard skill frontmatter in the shared browser/server/CLI bundle validator.

## Approval Notes
The user's 2026-09-13 request explicitly authorizes building this feature. Earlier commit, PR babysitting, and merge authorization remains applicable. No external issue tracker writes are needed.
