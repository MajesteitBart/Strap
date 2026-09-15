---
type: "Reference"
title: "Strap repository quickstart"
openwiki_generated: true
verified:
  - by: openwiki/0.5.2
    at: 2026-09-15T08:01:45.050Z
sources:
  - id: openwiki-source-57437a22cff4a22bf6cad26b
    resource: repo://app/(strap-app)/skills/page.tsx
  - id: openwiki-source-d50fd81fbca88c21dad2fe3c
    resource: repo://app/api/app/skills/route.ts
  - id: openwiki-source-ec0cc0403a8bc32670067aac
    resource: repo://lib/skill-tools.ts
  - id: openwiki-source-88e6ad79f1928eb328ce5be1
    resource: repo://lib/strap-prompts.ts
  - id: openwiki-source-bf3b2522d452c2e2b358c117
    resource: repo://packages/strap/src/skills/command.ts
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-20e3804921bc4842f28ea535
    resource: repo://supabase/migrations/20260913153559_bound_skill_storage.sql
  - id: openwiki-source-5971c63ee69c0e08a2f831c3
    resource: repo://supabase/tests/skill_storage.test.sql
generated: { by: "openwiki/0.5.2", at: "2026-09-15T08:01:45.050Z" }
---

# Strap repository quickstart

Strap maintains one compact, curated context profile that connected AI agents can read before meaningful work and improve through permission-aware updates. It is not a journal, chat transcript, or generic notes store: durable context should stay current, specific, and worth reading. The same model supports a one-user **Personal Strap** and a governed **Company Strap**.

This repository contains the public site, authenticated application, browser APIs, OAuth 2.1 and MCP server, Supabase schema and Vault-backed secret storage, OpenRouter/GitHub integrations, and the primary `@bvdm/strap` CLI. The current product name is **Strap**. Stable internal and protocol identifiers still use Creed where compatibility or migration history requires it; do not rename those source paths or contracts casually.

## Start here

- [Architecture overview](architecture/overview.md): runtime boundaries, request/state flow, and where code belongs.
- [Strap domain model](domain/strap-model.md): sections, proposals, permissions, onboarding, review, and Personal versus Company behavior.
- [Shared skills system](domain/skills-system.md): per-profile portable `SKILL.md` bundles, versioned publication, agent discovery, and device sync.
- [Agents, OAuth, MCP, and CLI](integrations/agents-and-oauth.md): browser/device OAuth, scoped API keys, explicit grants, protocol compatibility, and `packages/strap`.
- [Platform integrations](integrations/platform-services.md): Supabase, OpenRouter, GitHub sync, deployment, and the removed Stripe runtime.
- [Schema and security](data/schema-and-security.md): historical table names, RLS, credentials, Vault plaintext boundaries, and migrations.
- [Testing and change guide](development/testing-and-change-guide.md): verification commands, high-risk paths, and compatibility tests.

## Main surfaces

| Area | Current implementation |
|---|---|
| Web | Next.js 16 App Router, React 19, strict TypeScript |
| Backend | Supabase Auth, Postgres, RLS, realtime, retention jobs, and Supabase Vault |
| Product | `/file`, `/skills`, `/connections`, `/vault`, `/settings` under `app/(strap-app)/` |
| Skills | `SKILL.md` bundles published per Personal/Company profile; agents discover them via `strap_list_skills`/`strap_get_skill`; synced across devices by the `@bvdm/strap` CLI (`skills push`/`pull`/`sync`) |
| Agents | `/mcp` with browser/device OAuth 2.1 or scoped `strap_key_` keys; legacy `creed_key_` keys remain accepted |
| AI | OpenRouter using deployment-included AI or encrypted Personal/Company BYOK |
| Version control | GitHub push/pull with `strap.md` default and controlled `creed.md` fallback |
| Terminal | Primary Node 20+ package `@bvdm/strap` under `packages/strap` |

Browser APIs live under `app/api/app/**`, with `app/api/app/skills/**` serving the skill library (`listSkills`, `getSkill`, `strap_publish_skill`). `/api/app/headless-access/**` manages one-time-visible MCP keys and `/api/app/vault/**` manages Strap-scoped external secrets. Agent-facing protocol lives in `app/mcp/route.ts`, where the skill tools (`strap_list_skills`, `strap_get_skill`, `strap_export_skill`, `strap_publish_skill`) are advertised alongside the profile tools. Canonical direct HTTP routes are under `app/api/strap/**`; `app/api/creed/**` remains only as a compatibility API shim.

## Current product rules

- **No paid plans:** Open, Personal, and Company are all `$0 forever`. Company supports unlimited invited members. Stripe is absent from active dependencies, environment setup, and runtime routes.
- **Included AI or BYOK:** hosted Personal and Company can use a configured deployment OpenRouter key or their own encrypted key. The historical storage value `ai_mode = 'credits'` is surfaced as **Included**; it is not prepaid billing. Included usage is quota-controlled rather than unlimited (currently a process-local 20-request/60-second burst and a default `$0.50` trailing-24-hour at-cost ceiling per user).
- **Scoped agent access:** every modern OAuth token or headless key resolves one explicit Personal or Company grant. A credential mode (`read-only`, `proposal-only`, or `direct`) can narrow live membership and section permissions but never elevate them.
- **One-time-visible keys:** newly created keys use `strap_key_`; only the hash and display prefix are stored. Existing `creed_key_` keys remain accepted compatibility credentials.
- **Vault boundary:** `/vault` lists metadata only. Secret payloads are stored at rest in Supabase Vault and cross application/server memory only during explicit create, rotation, or audited reveal flows.

## Run locally

Use a current Node.js 22 release for root development and tests, plus a Supabase project. The compiled CLI packages declare Node.js 20+. OpenRouter and GitHub credentials are optional unless those flows are enabled.

```bash
npm install
cp .env.example .env.local
npx supabase link --project-ref <project-ref>
npx supabase db push
npm run dev
```

Populate placeholders described in `.env.example`; never read, print, or commit `.env.local`. Core categories are site URL, Supabase public URL/key, Supabase server secret, and the server-side encryption secret. Runtime prefers `STRAP_ENCRYPTION_SECRET` and falls back to the documented legacy `CREED_ENCRYPTION_SECRET`; treat the latter as a compatibility contract, not current product branding.

Root checks:

```bash
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
npm run audit:brand
```

Both CLI packages are intentionally excluded from the root TypeScript project and require independent checks. For the primary Strap CLI:

```bash
npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm pack ./packages/strap --dry-run
```

For migration changes, also run `npx supabase db reset` locally. Confirm the project reference before any remote database operation.

## Use the Strap CLI

```bash
npm install --global @bvdm/strap
strap

# Or without installation
npx @bvdm/strap
```

The default MCP server is `https://strap.bvdm.ai/mcp`. The CLI discovers live tools, resources, prompts, and schemas rather than hard-coding the server surface. See `packages/strap/README.md`.

`packages/creed-cli/` is a separate legacy compatibility package. It has different executable names, default server, environment variables, and credential storage. The two CLIs do not share or migrate credentials.

## Profile files and GitHub compatibility

- New Personal and Company integrations default to `strap.md` (`lib/profile-file.ts` and migration `20260724120000_strap_profile_defaults.sql`).
- An absent path or configured `strap.md` reads candidates in order: `strap.md`, then legacy `creed.md`.
- Any other explicit stored path—including `creed.md`—is read exactly, without fallback.
- A pull may adopt a resolved candidate. A push refuses to create a competing `strap.md` beside a fallback-resolved `creed.md`; migration must be explicit.
- Company supports GitHub push, not pull. Personal pull retains archived sections and imports active sections with proposal-level agent permission.

## Shared skills

Open `/skills` to create or import a standard `SKILL.md` folder, edit its files, publish a version, and restore earlier versions. Skills belong to the active Personal or Company profile: Company members can use them, and owners and admins publish. Connected agents discover skills through `strap_list_skills` and read relevant instructions with `strap_get_skill`; `strap_export_skill` downloads a complete bundle and `strap_publish_skill` writes a new version (direct connections only, owner/admin). Each profile has 64 MiB for current bundles and saved versions, with up to 20 versions per skill and oldest history removed first.

The `@bvdm/strap` CLI (0.2.0) syncs bundles across devices:

```bash
strap skills push ./my-skill
strap skills pull
strap skills sync --target codex --global
```

`sync` also publishes edits to managed skills and stops when edits conflict; replaced files are backed up outside the agent skill directory and scripts are never executed. Use a separate directory for each profile, and `--dry-run` to preview. See the [Shared skills system](domain/skills-system.md) page for the full resource model, validation, storage, and security boundary.

## Repository orientation

- `app/`: pages, browser APIs, OAuth/device endpoints, direct HTTP routes, and MCP server.
- `components/strap/`: authenticated Strap UI, including `strap-provider.tsx`, `strap-switcher.tsx`, and `skills-screen.tsx` (the `/skills` product screen).
- `lib/strap-*.ts`, `lib/company-*.ts`, and `lib/validation/strap-state.ts`: canonical domain, persistence, permission, and validation implementations; old `lib/creed-*` modules are deprecated compatibility re-export shims.
- `lib/skills.ts`, `lib/skill-mcp.ts`, `lib/skill-tools.ts`: server-side skill storage (Supabase RPCs) and MCP tool definitions (`strap_list_skills`, `strap_get_skill`, `strap_export_skill`, `strap_publish_skill`).
- `packages/strap/src/skills/`: shared skill-bundle validation and CLI `skills push`/`pull`/`sync` commands used by the `@bvdm/strap` CLI.
- `app/api/app/straps/`: browser APIs for listing and activating Straps.
- `app/api/app/skills/`: browser APIs for the skill library (`listSkills`, `getSkill`).
- `.agents/skills/strap-repo/`: repository-specific agent guidance and reference documentation.
- `lib/oauth.ts`, `lib/oauth-device.ts`, `lib/headless-access.ts`: browser/device OAuth and scoped key resolution.
- `lib/api-key-vault.ts`: authorized Supabase Vault operations and reveal auditing.
- `lib/profile-file.ts`: canonical `strap.md` default and legacy fallback policy.
- `packages/strap/`: primary `@bvdm/strap` MCP terminal client.
- `packages/creed-cli/`: legacy CLI compatibility package only.
- `supabase/migrations/`: canonical forward-only schema history; historical Creed and Stripe names remain unchanged.
- `tests/`: root contract, policy, migration, branding, and logic tests.

The canonical GitHub repository is [MajesteitBart/Strap](https://github.com/MajesteitBart/Strap). Treat `MajesteitBart/Creed` as historical only when it appears in explicit historical evidence.

## Core invariants

1. Strap is curated context, not append-only memory.
2. Marketing routes must not trigger signed-in account-state loading.
3. Browser APIs authenticate a Supabase user; agent APIs authenticate hashed bearer credentials.
4. Modern credentials are explicitly bound to one Personal or Company Strap and fail narrow when that grant becomes inaccessible.
5. Hidden sections are omitted server-side; credential mode can only reduce effective access.
6. Personal and Company persistence are intentionally different; do not route shared edits through Personal full-state autosave.
7. Service-role clients bypass RLS, so application authorization must precede every sensitive call. Vault RPC execution remains service-role-only.
8. Schema changes are forward-only migrations; do not rename historical tables, columns, functions, or migrations to match public branding.
9. MCP discovery is Strap-first, but exact `creed_*` tools, `creed://` resources, `/api/creed` routes, `creed_key_` credentials, and Creed-named database/internal identifiers remain supported compatibility contracts.
10. Shared skills are a distinct resource kind from context sections and Vault secrets: skill content is user-provided guidance, never commands to the host, and it cannot authorize secret access or override higher-priority instructions.
