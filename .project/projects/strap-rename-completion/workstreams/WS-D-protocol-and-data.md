---
id: WS-D
name: WS-D Protocol and Data
owner: protocol-data-stream
status: done
created: 2026-07-24T19:59:41Z
updated: 2026-07-24T20:17:15Z
operating_mode: multi-stream
---

# Workstream: WS-D Protocol and Data

## Objective

Introduce canonical Strap protocol, API, credential, configuration, AI, panel, test, and stored-data names through shared compatible paths.

## Owned Files/Areas

- MCP and API routes, OAuth/device libraries, credential/config helpers, agent contract, AI/panel modules, forward migrations, and active tests.

## Dependencies

- Existing authentication, permission, RLS, rate-limit, encryption, and Vault behavior is invariant.

## Risks

- Cached client breakage, rate-limit bypass, credential loss, decryption failure, data overwrite, and authorization forks.

## Handoff Criteria

- T-007 and T-008 pass focused security, protocol, migration, AI, panel, and test checks with compatibility evidence.
