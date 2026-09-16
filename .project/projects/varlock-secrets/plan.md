---
name: Varlock secrets provider
status: done
lead: MajesteitBart
created: 2026-09-16T01:51:56Z
updated: 2026-09-16T02:21:03Z
linear_project_id:
risk_level: medium
spec_status_at_plan_time: planned
operating_mode: feature
---

# Delivery Plan: Varlock secrets provider

## Architecture
WS-A owns the reveal flow. Add an empty-by-default bounded UUID array to the existing service-only key table. Validate item membership during creation and recheck live Vault access and the item's database-loaded profile before decrypting. Reuse the required reveal audit with key attribution. Add a POST-only canonical Strap route separate from MCP.

The provider registers `@initStrap`, `strapAccessKey`, and `strap()`, with one uncached authenticated request per resolution. Varlock is a peer/development dependency; esbuild is a development-only bundler. The application gains no dependencies.

## Workstream and Dependencies
- T-001: Server grants, audited reveal, UI selection/reference copying, provider package.
- T-002 depends on T-001: Authorization and transport tests, real Varlock smoke, schema/privilege checks, root quality gates, docs and evidence.

## Test Strategy
Focused tests execute real server modules with isolated persistence. Run all root tests, TypeScript, lint, brand audit, and production build. Independently typecheck/test/pack the provider. Run local Supabase reset and pgTAP in an isolated instance; exercise actual HTTP reveals with synthetic users and secrets.

## Rollout and Rollback
Handoff is a local feature branch. A later release applies the migration, deploys the route/UI, then publishes the package. Existing keys remain ungranted. Rollback application/provider code and revoke new keys; retain the additive column to preserve forward-only history.

## Policy Checks
- Local file contracts remain delivery truth.
- Explicit user implementation request authorizes local development and verification.
- No production changes, tracker changes, or automatic secret grants.
- Official API inspection and actual plugin loading resolve compatibility uncertainty.

## What Changed After Probe
The actual loader test selected CommonJS to support a relocated bundle.

## Technical Context
Next.js and strict TypeScript server routes; Supabase Vault; independent Node 22 provider package.

## Architecture Decisions
See decisions.md for per-item grants, dedicated reveal, sensitivity, no-cache and bundle decisions.

## Policy and Contract Checks
Existing keys remain ungranted. No MCP plaintext. No application runtime dependency additions. No external writes.

## Generated Artifact Map
CLI scaffolded spec, plan, decisions, WS-A, and T-001/T-002. Authored source, tests, migration and package documentation implement the contract.

## Complexity Exceptions
No new service or credential system; reuse scoped keys and Vault reveal.

## Probe-Driven Architecture Changes
Portable CommonJS bundle replaces the initially tested ESM output.

## Workstream Design
One sequential WS-A: implementation followed by verification and documentation.

## Milestone Strategy
T-001 delivers behavior; T-002 records full verification and local handoff.

## Rollout Strategy
After this local handoff, apply migration before application deployment and package publication.

## Rollback Strategy
Revert application/provider deployment and revoke new keys. Retain the additive schema column.

## Remaining Delivery Risks
Provider package is unpublished and production has not received the migration. Revocation only prevents future reveals.
