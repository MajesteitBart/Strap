---
id: WS-B
name: WS-B Supabase API Key Vault
owner: MajesteitBart
status: done
created: 2026-07-22T05:40:01Z
updated: 2026-07-22T06:11:18Z
operating_mode: multi-stream
---

# Workstream: WS-B Supabase API Key Vault

## Objective

Deliver an API-key vault whose secret payloads are encrypted and authenticated by Supabase Vault while Creed owns only metadata, authorization, and audit behavior.

## Owned Files/Areas

- Vault portions of the project migration and restricted database functions.
- `lib/api-key-vault.ts` and focused tests.
- `/api/app/vault*` route handlers.
- Vault audit action definitions.

## Dependencies

- Supabase Vault extension on local and hosted Postgres.
- Existing session authentication, Creed membership/roles, frozen-state policy, and service-role configuration.
- Shared migration coordination with WS-A.

## Risks

- Function execute grants or search paths expose decrypted values.
- Plaintext enters metadata, logs, audits, errors, caches, or list responses.
- Company-member policy is applied inconsistently between list and mutation endpoints.
- Deleting metadata and Vault values non-atomically leaves an orphan.

## Handoff Criteria

- Clean migration creates Vault-backed CRUD functions executable only by service role. Every function uses `SECURITY DEFINER`, `SET search_path = ''`, fully qualified objects, explicit revoke from PUBLIC/anon/authenticated, and service-role-only grant.
- Each Vault mutation and its metadata write execute inside one database function/transaction; delete cannot leave app-visible orphan metadata.
- Personal owner and company owner/admin authorization is consistent for all operations; other users are denied.
- List returns metadata only and reveal is explicit, `no-store`, and fails closed unless its required metadata-only audit event is persisted.
- Create/update/delete are atomic enough to avoid app-visible orphaned metadata and have focused tests.
