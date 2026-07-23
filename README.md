<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/assets/brand/brandmark-email-dark.png">
    <img alt="Strap" src="public/assets/brand/brandmark-email.png" width="208">
  </picture>
</h1>

**Bootstrap your agents with context, skills, and secrets.**

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

## Quickstart

Prerequisites: Node.js 20+ and a Supabase project. OpenRouter is optional and only required for AI features.

```bash
git clone https://github.com/MajesteitBart/Creed.git strap
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
CREED_ENCRYPTION_SECRET=<32-byte-base64-secret>
```

`CREED_ENCRYPTION_SECRET`, `/api/creed/**`, `creed_*` MCP tools, and other lower-level Creed identifiers are retained compatibility contracts. Customer-facing product, site, file defaults, and new connection setup use Strap.

Every optional variable is documented in [`.env.example`](./.env.example). Never commit `.env.local`.

## Connect an agent

Open `/connections` and add `https://strap.bvdm.ai/mcp` as a custom MCP server. Strap provides OAuth 2.1 authorization and first-class setup for Claude Code, Codex, Cursor, ChatGPT, Devin, OpenClaw, Hermes, OpenCode, Factory, Manus, and custom agents.

For terminal and coding-agent workflows, use the separate Strap CLI package:

```bash
npx @bvdm/strap
npx @bvdm/strap --agent codex call read_creed --json
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

Internal paths such as `components/creed`, `lib/creed-data.ts`, and `app/api/creed` remain stable until a separately approved compatibility migration.

## Commands

```bash
npm run dev
npm test
npx tsc --noEmit -p .
npm run lint
npm run build

npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm --prefix packages/strap pack --dry-run
```

## Contributing and security

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request. Coding agents should follow [`AGENTS.md`](./AGENTS.md).

Report vulnerabilities privately using the process in [`SECURITY.md`](./SECURITY.md).

## License

[MIT](./LICENSE)
