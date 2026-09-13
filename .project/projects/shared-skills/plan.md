---
name: Shared skills
status: done
lead: MajesteitBart
created: 2026-09-13T13:38:18Z
updated: 2026-09-13T16:27:12Z
linear_project_id:
risk_level: high
spec_status_at_plan_time: planned
operating_mode: feature
---

# Delivery Plan: Shared skills

## What Changed After Probe
No separate prototype needed. Existing source provides profile identity, MCP authentication, browser auth, and CLI transport.

## Technical Context
Next.js application and independent TypeScript CLI share a portable bundle validator under packages/strap/src/skills. Skill state is independent of Personal full-state saves and Company section mutations.

## Architecture Decisions
- Store bounded bundles and up to 20 complete revisions in Postgres JSONB, with a serialized 64 MiB encoded-data budget per profile. Prune oldest historical copies first; preserve current revisions. This keeps publication and history atomic without orphaned storage objects. Cache metadata separately so listing skills and history does not load full bundles.
- Service-only SECURITY INVOKER RPCs explicitly validate membership. RLS is enabled, and client table/RPC privileges are revoked. This follows existing Company server authorization while avoiding new definer functions.
- The profile owner and Company admins publish. All live members may read. MCP additionally requires a direct credential for publishing; no automatic proposal or hidden write escalation.
- YAML parsing uses a pinned direct dependency in the app and CLI. Alias expansion is disabled. Files are canonicalized, hashed, path-checked, and bounded.
- CLI locks a sync directory, preflights the selection, and uses a ledger scoped by server and profile. Replacements preserve old directories outside the agent skill root. Archives use the same backup boundary.
- Device setup supports Codex and Claude Code directories and arbitrary explicit paths. No background process, secret injection, or script execution is installed.

## Policy and Contract Checks
- [x] .project remains delivery metadata, never product data.
- [x] Probe decision is explicit.
- [x] Evidence gates are defined before release.
- [x] User authorized feature delivery, commits, PR review, and merge; no tracker writes.

## Generated Artifact Map
Spec and plan record the requested feature. WS-A owns the sequential implementation. T-001 covers schema/APIs, T-002 UI/onboarding, T-003 device sync, T-004 verification and release.

## Complexity Exceptions
One shared source module resides inside the independently published CLI and is imported by the application to prevent validator drift. Owner: MajesteitBart.

## Probe-Driven Architecture Changes
None.

## Workstream Design
One implementer, sequential tasks. No internal subagents and no new redesign delegation.

## Milestone Strategy
Complete and test storage/API before final UI and CLI validation. Then review the integrated feature as one coherent release.

## Rollout Strategy
Apply and verify the additive migration on a disposable local Supabase. Dry-run and apply only the new migration to the verified hosted project before deploying callers. Open a PR, address exact-head review findings and CI, merge, verify production, and publish/verify CLI 0.2.0 when credentials permit.

## Test Strategy
Pure bundle and permission tests; CLI two-device, conflict, dry-run, archive, binary, and path safety tests; SQL role denials, membership changes, revision/history and concurrent publication tests; browser Personal/Company, empty/edit/error, desktop/mobile and onboarding checks; root tests/types/lint/build, both CLI packages and pack checks; two-model skill discovery/read contract exercise.

## Rollback Strategy
Revert the app/CLI release if required. Keep additive tables and stored revisions intact. Local installs retain recoverable backups. Never reset hosted data or remove historical migrations.

## Remaining Delivery Risks
npm publication may need interactive maintainer authentication. Supabase management advisors remain unavailable without an authorized access token, but database migration credentials are configured. Documentation automation stays paused while this user-requested feature is delivered.
