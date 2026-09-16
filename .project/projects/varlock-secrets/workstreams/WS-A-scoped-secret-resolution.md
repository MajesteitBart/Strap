---
id: WS-A
name: WS-A Scoped secret resolution
owner: codex
status: done
created: 2026-09-16T01:51:56Z
updated: 2026-09-16T02:21:03Z
operating_mode: feature
---

# Workstream: WS-A Scoped secret resolution

## Objective
Deliver the provider and bounded reveal contract on a feature branch.

## Owned Areas
Provider package, key/Vault services and routes, Connections/Vault controls, migration, tests, CI and setup docs.

## Dependencies and Risks
Existing key, membership, Vault RPC and audit contracts; official Varlock API. Tests cover accidental access expansion, plaintext diagnostics, role changes, cross-profile confusion, and plugin-loader compatibility.

## Handoff Criteria
T-001/T-002 acceptance scenarios pass, evidence is recorded, and deployment order is documented. Publication and deployment are outside this task.
