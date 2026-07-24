<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/assets/brand/brandmark-email-dark.png">
    <img alt="Strap" src="public/assets/brand/brandmark-email.png" width="208">
  </picture>
</h1>

**Bootstrap your agents with context, skills, and keys.**

Pack durable context once. Every connected agent reads it before meaningful work and proposes focused improvements as it learns.

[Home](https://strap.bvdm.ai) | [Docs](https://strap.bvdm.ai/docs) | [Pricing](https://strap.bvdm.ai/pricing) | [Stack](https://strap.bvdm.ai/stack) | [Privacy](https://strap.bvdm.ai/privacy)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![MCP](https://img.shields.io/badge/protocol-MCP%20%2B%20OAuth%202.1-8A2BE2)](https://strap.bvdm.ai/docs)

</div>

## What is Strap?

Strap maintains one compact, curated personal context profile in plain Markdown. Claude, ChatGPT, Codex, Cursor, Devin, and any compatible MCP client can read it before responding. Agents propose narrow updates as they learn durable facts, and section permissions decide whether a change applies directly or waits for review.

Strap is not a notes app, journal, chat-memory store, or generic AI wrapper. The profile stays small, current, specific, permission-aware, and worth reading.

The resource model extends beyond context:

- Context gives agents durable personal or company knowledge.
- Skills provide reusable workflows and capabilities.
- Secrets remain server-side and are revealed only through explicit, permission-aware flows.
- Environments and agent connections determine where those resources are available.

Personal Strap is the core one-user product. Company Strap applies the same model to a governed workspace with roles, per-section permissions, attribution, and invites.

## Current capabilities

- `/file` keeps Personal and Company profiles compact, reviewable, permission-aware, and exportable as Markdown.
- `/connections` supports browser OAuth and device authorization. Headless workflows can create a scoped `strap_key_` key whose plaintext is shown once; each key is bound to one Personal or Company profile and a maximum access mode. Existing `creed_key_` credentials remain accepted.
- `/vault` stores secret values in Supabase Vault. Ordinary lists, logs, and agent context expose metadata or `secret://` references only; plaintext is returned solely through an explicit, audited reveal.
- `@bvdm/strap` is the primary terminal client. It discovers the live MCP contract and supports interactive browser login, device login, and scoped API-key authentication.
- The current product has no paid plans. Self-hosted operation still requires the configured Supabase services and any optional provider credentials used by enabled integrations.

Live product and protocol guidance is available in [Docs](https://strap.bvdm.ai/docs).

## Quickstart

Prerequisites: Node.js 20+ and a Supabase project. OpenRouter is optional and only required for AI features.

```bash
git clone https://github.com/MajesteitBart/Strap.git strap
cd strap
npm install
cp .env.example .env.local
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npm run dev
```

Minimum `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<service-role-key>
STRAP_ENCRYPTION_SECRET=<32-byte-base64-secret>
```

New configuration uses `STRAP_ENCRYPTION_SECRET` and `STRAP_AGENT_MODEL`; existing `CREED_ENCRYPTION_SECRET` and `CREED_AGENT_MODEL` values remain lower-priority fallbacks. Canonical direct APIs live under `/api/strap/**`, and MCP discovery uses Strap tools, prompts, and `strap://profile`. `/api/creed/**`, `creed_*`, `creed://profile`, and other lower-level Creed identifiers remain compatibility contracts.

Every optional variable is documented in [`.env.example`](./.env.example). Never commit `.env.local`.

## Connect an agent

Open `/connections` and add `https://strap.bvdm.ai/mcp` as a custom MCP server. Strap provides OAuth 2.1 authorization and first-class setup for Claude Code, Codex, Cursor, ChatGPT, Devin, OpenClaw, Hermes, OpenCode, Factory, Manus, and custom agents.

Connections never inherit broader access than their user. OAuth tokens and modern API keys resolve one explicit Personal or Company profile, then the selected connection mode can only narrow live membership and per-section permissions. Hidden sections are omitted server-side.

For terminal and coding-agent workflows, use the separate Strap CLI package:

```bash
npx @bvdm/strap
npx @bvdm/strap --agent codex call read_strap --json
```

The CLI discovers tools, resources, and prompts from the live MCP server. Its configuration is isolated from the legacy `creed-cli` package.

## Files and compatibility

- New exports and GitHub integrations default to `strap.md`.
- Existing integrations keep their stored path, including `creed.md`.
- Reads can fall back from `strap.md` to `creed.md` for legacy repositories.
- Pushes never create a competing `strap.md` beside an existing legacy profile without an explicit migration.
- `https://creed.md` remains an MCP/OAuth compatibility origin during the migration window. It must serve protocol endpoints directly, not rely on blanket redirects.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, React 19, strict TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, Tiptap, Motion |
| Backend | Supabase Auth and Postgres with RLS, realtime, and Vault |
| AI | OpenRouter with included and BYOK modes |
| Sync | GitHub push/pull with lossless Markdown round trips |
| Agent access | OAuth 2.1, MCP, scoped API keys, and `@bvdm/strap` |

Full tour: [strap.bvdm.ai/stack](https://strap.bvdm.ai/stack).

## Repository map

```text
app/                    public, authenticated, OAuth, API, and MCP routes
components/             product, marketing, auth, and shared UI
lib/                    domain, persistence, authorization, AI, and integrations
packages/strap/         @bvdm/strap CLI package
packages/creed-cli/     legacy CLI compatibility package
supabase/migrations/    canonical forward-only schema and RLS
tests/                  Node contract and logic tests
.project/               Delano delivery contracts and durable context
```

Canonical implementation paths use `components/strap`, `app/(strap-app)`, and `lib/strap-*`. Narrow `lib/creed-*` re-export shims and the `/api/creed` alias routes remain where source or protocol compatibility requires them.

## Commands

```bash
npm run dev
npm test
npx tsc --noEmit -p .
npm run lint
npm run build

npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm pack ./packages/strap --dry-run
```

## Contributing and security

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request. Coding agents should follow [`AGENTS.md`](./AGENTS.md).

Report vulnerabilities privately using the process in [`SECURITY.md`](./SECURITY.md).

## License

[MIT](./LICENSE)
