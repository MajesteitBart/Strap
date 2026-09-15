---
type: "Reference"
title: "Testing and change guide"
description: "Verification commands, the focused test map, change-map entries for naming, OAuth/MCP, Vault, profile files, AI behavior, sections, and skills, plus high-risk paths and known coverage gaps."
tags: ["testing", "verification", "change-map", "high-risk", "skills", "coverage"]
verified:
  - by: openwiki/0.5.2
    at: 2026-09-15T08:01:45.050Z
sources:
  - id: openwiki-source-3e96eb3f64ceeca8c914fb05
    resource: repo://app/mcp/route.ts
  - id: openwiki-source-8366085c99164a254fe3789b
    resource: repo://lib/skill-mcp.ts
  - id: openwiki-source-ec0cc0403a8bc32670067aac
    resource: repo://lib/skill-tools.ts
  - id: openwiki-source-498d6de41dfe5f643fbc25e1
    resource: repo://packages/strap/package.json
  - id: openwiki-source-813e622f4a20029068bebaa6
    resource: repo://packages/strap/src/skills/bundle.ts
  - id: openwiki-source-5fd015b7c7da6f7f23eedfe8
    resource: repo://packages/strap/src/skills/files.ts
  - id: openwiki-source-972939a60905ccf1033bd177
    resource: repo://packages/strap/src/skills/sync.ts
  - id: openwiki-source-d3cc8a0af7c0637c2bf88205
    resource: repo://packages/strap/tests/skills.test.ts
  - id: openwiki-source-f018073fb8d385555d7f8e92
    resource: repo://supabase/migrations/20260913133911_shared_skills.sql
  - id: openwiki-source-20e3804921bc4842f28ea535
    resource: repo://supabase/migrations/20260913153559_bound_skill_storage.sql
  - id: openwiki-source-e927c6b6a3d86d7b06861457
    resource: repo://tests/skill-bundles.test.ts
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
generated: { by: "openwiki/0.5.2", at: "2026-09-15T08:01:45.050Z" }
---

# Testing and change guide

## Standard verification

```bash
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
npm run audit:brand

npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm pack ./packages/strap --dry-run
```

The root `tsconfig.json` excludes `packages/strap` and `packages/creed-cli` so Netlify/root builds do not compile their Node-specific code. Root typecheck therefore does not validate `packages/strap`; run package checks explicitly. When legacy CLI compatibility changes, also run:

```bash
npm --prefix packages/creed-cli run typecheck
npm --prefix packages/creed-cli test
```

For database changes run `npx supabase db reset`, then exercise affected routes/UI. OpenWiki maintenance itself does not run application tests.

## Focused test map

| Area | Representative tests |
|---|---|
| Skills | `tests/skill-bundles.test.ts` |
| Strap naming/protocol | `strap-brand`, `strap-protocol-compatibility`, `strap-agent-contract` |
| Profile defaults/GitHub | `strap-profile-defaults-migration`, `profile-file`, `github-roundtrip` |
| OAuth, keys, Vault | `headless-access-vault`, `mcp-connection-status`, `mcp-health-filter`, `connection-actions` |
| Company policy | `company-permissions`, `company-onboarding`, `company-proposal-drafts` |
| Editor/rich text | `editing-system`, `rich-text-equivalence`, `section-suggestions` |
| AI/agent behavior | `panel-*`, `tab-completion`, `quality-scope`, `openrouter-routing` |
| Primary CLI | `packages/strap/tests/**` |
| Legacy CLI | `packages/creed-cli/tests/**` |

Most root tests exercise pure functions, contracts, migration text, or source invariants. They do not replace browser, live Supabase/RLS/Vault, OAuth, GitHub, or OpenRouter integration testing.

`tests/skill-bundles.test.ts` is the skill-specific entry in the focused test map. It is a pure-function/contract test suite: it imports the portable bundle validator (`packages/strap/src/skills/bundle.ts`) and the server toolset/guards (`lib/skill-tools.ts`) directly and asserts behavior in memory. It does not exercise a live Supabase RPC, RLS, or a real MCP exchange, so it does not replace live `strap_skills_read` / `strap_skill_publish` RPC, RLS, or MCP integration tests. It covers:

- portable bundle validation: folded-YAML description parsing, binary-asset base64 round-trip, `canonicalSkillContent` order-independence;
- path safety: rejection of traversal, absolute paths, drive letters, Windows device names, hidden folders, `node_modules`, credentials, dangling dots/spaces, and mixed-case parent-directory collisions;
- size and structural guards: the 512 KiB per-file limit, 2 MiB bundle limit, duplicate-path detection, file/folder collisions, YAML aliases, duplicate keys, and name/frontmatter mismatch;
- the batch-payload guard `isSkillPayloadBatch` (full-bundle tools cannot be multiplied through a 2–64 request batch);
- mode/role gating via `canPublishSkills` and `skillToolsFor` (publishing requires `direct` + `owner`/`admin`; read/export tools are listed for any connection with a `strapId`);
- `skillReadPayload` returning instructions plus a bounded manifest (no inline base64) for empty/missing `filePath`, the selected file's content for a real path, and `null` for a missing path.

## Change map

### Product naming and compatibility

Start with `lib/marketing/brand.ts`, `lib/profile-file.ts`, `app/mcp/route.ts`, `/api/strap/**`, and `scripts/check-strap-rebrand.mts`. New customer-facing vocabulary and implementation paths are Strap, but preserve exact compatibility/history identifiers: Creed database objects, migrations, deprecated `lib/creed-*` compatibility re-export shims, `/api/creed/**` compatibility APIs, `creed_*`, `creed://`, existing `creed_key_`, and `packages/creed-cli`. Do not remove compatibility paths as a drive-by cleanup. Repository and GitHub references must use `https://github.com/MajesteitBart/Strap`; retain the old remote name only in explicit historical evidence.

### OAuth, MCP, connections, and CLI

Verify PKCE, redirect validation, one-time code/device consumption, polling backoff, token rotation/revocation, explicit Personal/Company grants, all three mode ceilings, hidden-section filtering, fail-narrow modern grants, and legacy-only Personal fallback. Check canonical Strap discovery and every exact compatibility alias through the same dispatcher. Test `packages/strap` separately and exercise real MCP clients for protocol changes.

### Vault

Start with `lib/api-key-vault.ts`, `app/api/app/vault/**`, `components/strap/api-key-vault-screen.tsx`, and Vault migrations. Verify metadata-only list, Personal and Company owner/admin/member behavior, item-loaded authorization, service-role-only RPCs, create/reveal/rotate/delete, no-store responses, 30-second UI clearing, and fail-closed reveal audit. Remember that Vault protects storage; explicit operations carry plaintext through bounded server/browser memory.

### Profile files and GitHub

Start with `lib/profile-file.ts`, `lib/strap-markdown.ts`, GitHub modules/routes, and profile/GitHub tests. `lib/creed-markdown.ts` is only a deprecated compatibility re-export shim. Verify new `strap.md` defaults, fallback read to `creed.md`, custom paths, no parallel-file push, SHA conflicts, Personal preview/apply, Company push, and formatting round trips.

### Free-plan and AI behavior

Pricing facts live in `lib/marketing/pricing.ts`: all current plans are `$0 forever`. There is no Stripe runtime. Treat Stripe-named migrations and billing records as history unless active source proves otherwise. AI still has included-key/BYOK, usage, quota, routing, and persistence behavior. Included AI uses a process-local 20-request/60-second burst limit and a default `$0.50` estimated-cost ceiling over the trailing 24 hours per user, configurable with `INCLUDED_AI_DAILY_LIMIT_USD`; absent `OPENROUTER_PLATFORM_KEY` requires BYOK. Test provider errors and usage accounting independently from customer billing.

### Sections and Company policy

Read `components/strap/file-screen.tsx`, `components/strap/strap-provider.tsx`, `lib/strap-data.ts`, `lib/strap-permissions.ts`, `lib/validation/strap-state.ts`, and `lib/company-sections.ts`. Verify Personal/Company separately, direct/proposal behavior, revision conflicts, hidden sections, version history, and TypeScript/SQL policy equivalence.

### Skills

Start with `lib/skills.ts`, `lib/skill-mcp.ts`, `lib/skill-tools.ts`, `lib/skills-http.ts`, `app/api/app/skills/**`, `components/strap/skills-screen.tsx`, `packages/strap/src/skills/*`, and the `20260913133911_shared_skills.sql` / `20260913153559_bound_skill_storage.sql` migrations. Skills are intentionally separate from section editing, the proposal lifecycle, and Vault secrets; do not couple them.

Portable bundle validation lives in `packages/strap/src/skills/bundle.ts` and is shared by the CLI, the browser editor (`components/strap/skills-screen.tsx`), and the server (`lib/skills.ts`). Verify: path safety (no traversal, absolute paths, drive letters, hidden folders, `node_modules`, credentials, Windows device names, dangling dots/spaces, mixed-case parent collisions), size limits (1–128 files, ≤512 KiB per file, ≤2 MiB per bundle), canonical base64, UTF-8 round-trip, a root UTF-8 `SKILL.md` with YAML frontmatter (`name` 1–64 lowercase-hyphen-numeric, `description` 1–1024 chars, no aliases, unique keys), and the frontmatter name matching the request/directory.

Service-role RPC authorization lives in the two migrations. `strap_skills_read` and `strap_skill_publish` are `security invoker`, `search_path = ''`, with grants revoked from `public`/`anon`/`authenticated` and execute granted only to `service_role`; no client role gets direct table access. Verify: owner/admin publish gating (non-owner/admin raises `42501`→403), membership recheck under row locks (`for share` on `creeds` + the caller's `creed_members` row for reads; `for update` on `creeds` + `for share` on membership for publishes), the stale-revision conflict (`p_base_revision` mismatch raises `PT409`→409) with the idempotent-retry exception (identical files, digest, and archive state return the existing document without a new revision), and the 64 MiB storage budget plus 20-version cap (history pruned to the most recent 20 versions; a 100-skill-per-library cap is enforced on new-skill creation).

MCP batch rejection: `isSkillPayloadBatch` (in `lib/skill-tools.ts`, called from `app/mcp/route.ts`) refuses any 2–64 request batch that contains a `strap_get_skill`, `strap_export_skill`, or `strap_publish_skill` call, because full bundles are loaded even for selected-file reads and must not be multiplied. Verify single skill calls succeed and the batch form returns JSON-RPC `-32600`.

Mode/role gating: `skillToolsFor` adds all four skill tools to `tools/list` for any connection with a `strapId`, but omits `strap_publish_skill` unless `canPublishSkills(mode, role)` is true (`mode === "direct"` and `role` is `owner` or `admin`). `callSkillTool` (`lib/skill-mcp.ts`) re-checks `canPublishSkills` before publishing and applies a 20-request/60-second per-user publish rate limit (`checkRateLimit`, 429 on overflow). The browser PUT path (`app/api/app/skills/[name]/route.ts`) applies the same rate limit and `no-store` response policy.

CLI sync conflict handling: `packages/strap/src/skills/sync.ts` and `files.ts` own the directory sync. Verify the preflight-conflict rule (any planned conflict aborts the whole selection before any file or published skill is changed), the per-directory sync lock (`.strap-skills.lock`), profile binding (the `.strap-skills.json` ledger binds one server/profile per directory; a second profile/server is rejected), symlink/junction refusal, TOCTOU re-reads during install, backup-aside replacement, archive behavior, and `pushSkill` `--base-revision` resolution. Run `npm test` (skill-bundles) for the portable bundle and toolset contracts, and the `packages/strap` checks (`npm --prefix packages/strap run typecheck` then `npm --prefix packages/strap test`, which builds then runs `dist/tests/*.test.js` including `skills.test.ts`) for CLI skill changes. These are pure-function/contract tests and do not replace live Supabase RPC, RLS, or MCP integration tests.

## High-risk and known gaps

High-risk files include `app/mcp/route.ts`, `lib/strap-data.ts`, `lib/company-sections.ts`, editor/provider orchestration, and Markdown parsing. Compatibility aliases, security policy, and agent instructions make small-looking changes broad.

Coverage gaps remain around end-to-end OAuth/device flows, live MCP authorization, RLS/Vault RPC execution and concurrency, GitHub OAuth/pull races, OpenRouter streaming/failure behavior, browser-level Personal/Company collaboration, and live `strap_skills_read` / `strap_skill_publish` RPC behavior (the root `skill-bundles` test only covers portable validation and the in-memory toolset, not the database RPCs, RLS, or a real MCP round-trip). Verify current source and ordered migrations over stale comments or historical names.
