---
type: "Reference"
title: "Schema and security"
description: "Historical table names, RLS, credentials, Vault plaintext boundaries, shared skill storage, and forward-only migration rules."
tags: ["schema", "security", "rls", "vault", "skills", "migrations"]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-15T08:01:45.050Z
sources:
  - id: openwiki-source-386d6eab0cb3539636a6ed00
    resource: repo://app/api/app/skills/%5Bname%5D/route.ts
  - id: openwiki-source-2712b3e23bdacdff46d2721c
    resource: repo://lib/api-key-vault.ts
  - id: openwiki-source-a238084d55fb7b2ff789741a
    resource: repo://lib/audit-log.ts
  - id: openwiki-source-c1f455c2488e681e5d392f65
    resource: repo://lib/secret-crypto.ts
  - id: openwiki-source-8d6d4022b7bc27f2adc20d95
    resource: repo://lib/skills.ts
  - id: openwiki-source-813e622f4a20029068bebaa6
    resource: repo://packages/strap/src/skills/bundle.ts
  - id: openwiki-source-1587d9942e8c664e1e9c4ad7
    resource: repo://supabase/migrations/20260722120000_headless_access_and_secret_vault.sql
  - id: openwiki-source-6d672f44f2843af8e0606ad6
    resource: repo://supabase/migrations/20260724120000_strap_profile_defaults.sql
  - id: openwiki-source-f018073fb8d385555d7f8e92
    resource: repo://supabase/migrations/20260913133911_shared_skills.sql
  - id: openwiki-source-20e3804921bc4842f28ea535
    resource: repo://supabase/migrations/20260913153559_bound_skill_storage.sql
generated: { by: "openwiki/0.5.2", at: "2026-09-15T08:01:45.050Z" }
---

# Schema and security

## Schema evolution and naming

`supabase/migrations/` is forward-only history. The schema evolved from Personal profiles and static agent tokens through GitHub/AI/audit, hashed credentials, OAuth/MCP, Company workspaces, permissions/versioning, and finally scoped headless access plus Supabase Vault.

Stable database identifiers remain Creed-named: `creeds`, `creed_members`, `creed_sections`, `creed_proposals`, `creed_headless_access_keys`, `creed_vault_items`, `creed_id`, and `creed_vault_*` RPCs. Historical migrations also retain Stripe-era tables/columns. Strap branding does not authorize renaming these contracts.

The skill library is the deliberate exception: `strap_skills`, `strap_skill_versions`, and the `strap_skills_read` / `strap_skill_publish` RPCs are **new Strap-named objects**, not legacy Creed identifiers renamed for branding. They were introduced alongside the Creed-named contracts and should remain Strap-named; do not alias them to `creed_*` names. They model workflow skills, a concept that did not exist in the historical schema.

`20260724120000_strap_profile_defaults.sql` changes customer-facing defaults only: new Personal/Company GitHub paths become `strap.md`, untouched generated `Your Creed` names become `Your Strap`, and future Vault descriptions say `Managed by Strap`. The RPC/table names and internal Vault secret prefix remain Creed-named.

## Representative records

| Concept | Storage |
|---|---|
| Strap/workspace | `creeds` (`personal` or `company`) |
| Membership | `creed_members` with owner/admin/member role |
| Content/review/history | `creed_sections`, `creed_proposals`, `creed_activity`, section versions, audit events |
| Agent access | legacy tokens, OAuth clients/codes/tokens/grants, headless keys, device authorizations, MCP events |
| Secret metadata | `creed_vault_items`; payload referenced by `vault_secret_id` |
| Shared workflow skills | `strap_skills` current bundles + `strap_skill_versions` retained history |
| Integration/history | Personal/Company GitHub and BYOK records; retained entitlement/billing/seat/credit history |

Read the latest migration touching a table, not only its creation migration.

## Authorization layers

### Session and service role

Browser APIs authenticate with Supabase `auth.getUser()`. Session clients operate under RLS. Company mutation routes often authorize membership/role/section policy before a service-role write.

The admin client bypasses RLS. User identity plus entitlement/membership/role/item ownership checks must precede every admin operation. Never treat a client-supplied `creed_id`/`strapId` as authorization.

### Agent credentials and explicit grants

OAuth access/refresh tokens and legacy agent tokens use SHA-256 hashes for lookup; recoverable OAuth values use AES-256-GCM through `lib/secret-crypto.ts`. Device/user codes and headless API keys are hash-only.

New headless keys use `strap_key_`; existing `creed_key_` values remain recognized compatibility credentials. Each key is shown in plaintext only in the creation response, while storage retains its digest and display prefix. It binds one creator, one Personal or Company Strap, one mode (`read-only`, `proposal-only`, or `direct`), and optional expiry. MCP rechecks revocation, expiry, creator membership, grant, and live section permission.

Modern OAuth grants likewise identify exactly one Strap. Browser consent selects Personal/Company and currently records a direct ceiling; device consent explicitly selects the maximum mode. Mode is always a ceiling. Missing/inaccessible modern grants fail narrow; only positively identified legacy OAuth tokens without explicit grants may use the historical Personal fallback.

### Service-role RPC pattern

Several sensitive operations are exposed only through Postgres RPCs that no client role can call directly. Two families follow this pattern:

- **Vault RPCs** (`creed_vault_create_secret`, `creed_vault_reveal_secret`, `creed_vault_update_secret`, `creed_vault_delete_secret`) are `security definer`, `search_path = ''`, and execute revoked from `public`/`anon`/`authenticated` with execute granted only to `service_role`. They touch Vault payloads and `creed_vault_items`.
- **Skills RPCs** (`strap_skills_read`, `strap_skill_publish`) are `security invoker`, `search_path = ''`, and likewise execute revoked from `public`/`anon`/`authenticated` with execute granted only to `service_role`. They read/write `strap_skills` and `strap_skill_versions`.

In both cases only the service-role admin client invokes the RPC, so the invoker-vs-definer distinction does not relax authorization: application checks precede the call, and the function rechecks live `creed_members` membership/role against the database before returning or writing. Keep the TypeScript permission logic (`lib/skills.ts`, Vault routes) and the SQL RPC bodies aligned as twins.

## Shared skills storage

### Tables

`public.strap_skills` holds the current bundle per `(strap_id, name)`:

| Column | Notes |
|---|---|
| `id` | PK, `gen_random_uuid()` |
| `strap_id` | FK to `creeds(id)` `on delete cascade` |
| `name` | 1–64 chars, `^[a-z0-9]+(-[a-z0-9]+)*$`; `unique (strap_id, name)` |
| `description` | 1–1024 chars |
| `revision` | `> 0`, incremented on each publish |
| `digest` | 64-hex SHA-256 of canonical content |
| `files` | jsonb array, 1–128 entries, `octet_length <= 12582912` (12 MiB) |
| `byte_count` | decoded bundle bytes, 1–2097152 (2 MiB) |
| `file_count` | generated, `jsonb_array_length(files)` |
| `storage_bytes` | generated, `octet_length(files::text)` |
| `archived` | boolean, default false |
| `updated_by` / `updated_at` | publisher and time |

`public.strap_skill_versions` retains complete prior documents, keyed by `primary key (skill_id, revision)`. It also stores a generated `summary jsonb` (`document - 'files'`, the metadata shown in version lists) and `storage_bytes integer` (`octet_length(document::text)`). Both tables cascade-delete with their `creeds`/`strap_skills` parent.

Bundles are validated in the application before they reach the RPC: `packages/strap/src/skills/bundle.ts` enforces 1–128 files, ≤2 MiB total decoded bytes, ≤512 KiB per file, portable relative paths (no traversal, hidden folders, `node_modules`, or credentials), canonical base64, valid UTF-8, a root UTF-8 `SKILL.md` with YAML frontmatter, and a frontmatter `name`/`description` matching the request. The server (`lib/skills.ts`) recomputes the SHA-256 digest over the canonicalized bundle and revalidates name/revision before calling `strap_skill_publish`.

### RLS and grants

Both tables enable RLS. All privileges are revoked from `public`, `anon`, and `authenticated`; only `service_role` gets `select, insert, update, delete` on the tables and `execute` on `strap_skills_read`, `strap_skill_publish`, and the immutable `strap_skill_document` helper. No client role receives direct table access.

### Read authorization (`strap_skills_read`)

`strap_skills_read` takes `p_user_id`, `p_strap_id`, optional `p_name`, and optional `p_revision`. It takes a `for share` lock on the `creeds` row and a `for share` lock on the caller's `creed_members` row so a membership/profile removal cannot interleave with a read. A missing role raises `42501` (mapped to HTTP 403). With `p_name` null it returns the library summary — `canManage` (role in `owner`/`admin`), `storageBytes` (current bundles + retained versions), and a per-skill summary list without `files`. With `p_name` set it returns the current or specified-revision document plus a versions list (summaries only). Missing skill/version raises `P0002` (HTTP 404). Any role member may read; only owner/admin gets `canManage`.

### Publish authorization and concurrency (`strap_skill_publish`)

`strap_skill_publish` serializes within a library by taking `for update` on the `creeds` row, then a `for share` lock on `creed_members` to recheck the caller's role. A null role or a non-owner/admin role raises `42501` (403). It then `for update` locks the matching `strap_skills` row:

- **Existing skill:** if `p_base_revision` does not equal the stored `revision`, a stale revision normally raises `PT409` (409). The exception is an idempotent retry — if the supplied files, digest, and archive state exactly match what is already stored, the function returns the existing document without a new revision. This makes a safe retry after a lost publish response a no-op rather than a spurious conflict.
- **New skill:** `p_base_revision` must be `0`, a bundle must be supplied, and `p_archived` must be false, otherwise `PT409` (409). The 100-skill-per-library cap is checked here; reaching it raises `54000` (422).

On a successful write, `revision` is incremented, `updated_by`/`updated_at` are set, a complete document is inserted into `strap_skill_versions`, and versions older than `revision - 20` are pruned (keeping the most recent 20, including the current one).

### Storage budget

After the write and pruning, the function recomputes total library usage as the sum of `strap_skills.storage_bytes` (current bundles) plus `strap_skill_versions.storage_bytes` (retained history). The budget is **64 MiB (67108864 bytes)** per library, shared between current bundles and history.

If usage exceeds the limit, the function prunes the oldest historical copies first — strictly versions whose `revision < s.revision` (never a skill's current revision), ordered by `updatedAt` then `skill_id`/`revision`, deleting just enough to get under budget. It then recomputes usage; if still over, it raises `54000` (422) with the message "Library storage is full (64 MiB including history)…", and the exception rolls back the publication and all attempted history pruning. There is also a hard 100-skill cap per library (checked on new-skill creation) and a 20-version retention window per skill.

### HTTP surface

Browser reads and publishes enter through `app/api/app/skills/**`, which authenticate via `requireApiAuth` (Supabase session) and call `lib/skills.ts`. Responses are `private, no-store`. The PUT publish is rate-limited to 20 publications per user per 60 seconds (`checkRateLimit`, 429 on overflow). `lib/skills.ts` maps RPC error codes to HTTP statuses (`42501`→403, `P0002`→404, `PT409`→409, `22023`→400, `54000`→422, unknown→503). The full skills workflow (CLI sync, agent MCP tools, conflict/archive behavior) is documented in the domain skills page; this page covers only the storage and security boundary.

## Supabase Vault plaintext boundary

`/vault` manages Strap-scoped external secrets:

- `public.creed_vault_items` stores metadata and `vault_secret_id`, not payload plaintext.
- Lists select metadata only.
- Service-role-only, `security definer` `creed_vault_*` RPCs create, decrypt, update, and delete Vault payloads; execution is revoked from `public`, `anon`, and `authenticated`.
- Personal access requires live membership. Company access requires owner/admin; members receive `403`.
- Item mutation/reveal authorizes using the item's database-loaded `creed_id`, not a caller-selected profile.

Supabase Vault is an at-rest boundary, not a claim that plaintext never reaches application code. Plaintext exists transiently in:

1. create/rotate browser form and request body;
2. Node route/RPC arguments;
3. service-role RPC execution and Vault decrypted view;
4. an explicit reveal RPC result, app-server memory, no-store JSON response, and temporary browser state.

Reveal is fail-closed: `recordRequiredAuditEvent` must persist `vault.secret_revealed` before plaintext is returned, or the route returns `503`. Decryption and `last_accessed_at` update have already occurred inside the RPC at that point, but plaintext is withheld from the HTTP response. The UI clears revealed state after 30 seconds. Ordinary lists, logs, and agent context expose metadata or references only.

`lib/secret-crypto.ts` is separate from Supabase Vault. It encrypts recoverable OAuth, GitHub, OpenRouter, and legacy application credentials.

## Free product and historical billing schema

There is no active Stripe dependency, checkout/webhook runtime, paid-plan gate, or paid Company-seat flow. Open, Personal, and Company are `$0 forever`. Historical `stripe_*`, entitlement, billing, seat-purchase, and credit-ledger records remain because migrations are forward-only and some non-payment state still uses older tables. Preserve them as history; do not infer live billing from schema names.

## Privacy, audit, and migration checklist

Hidden sections must be removed before payload construction. Profile content sent to agents is labeled as data, not instructions. Sensitive actions should use audit events; reveal uniquely requires durable audit success.

For migrations: add a timestamped file; preserve applied history; enable RLS before grants; constrain security-definer/invoker `search_path` and execute grants; keep TypeScript and SQL permission twins aligned; consider existing Personal/Company/history rows; run `npx supabase db reset` and `npm test`; and confirm the project reference before remote pushes.
