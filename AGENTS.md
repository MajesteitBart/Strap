# AGENTS.md

You're an AI coding agent picking up the Strap codebase. This file is the
short version of `README.md` + `CONTRIBUTING.md` written for you.

If a human is reading this, the document you want is [`README.md`](./README.md).

---

## Start here

1. Inspect git status and preserve unrelated worktree changes.
2. Read README.md, CONTRIBUTING.md, SECURITY.md, and the complete code path relevant to the task, including callers and tests.
3. Use a concise plan when the work needs one. Make the smallest coherent change and verify it.
4. Report what changed, what was actually verified, and any remaining gaps. Update the relevant source documentation when durable facts change.

Source code, migrations, and package scripts are canonical. Generated openwiki/ pages provide architecture references but can lag behind implementation; current database guidance is in db/README.md. The .agents/skills/ directory contains repository, UI, and Postgres guidance.

Do not spawn subagents unless the user explicitly requests them. External tracker writes require explicit authorization. Visual redesign needs an explicit request.

---

## What Strap is

One personal context profile every AI reads before answering the user.
10 sections (5 always-on, 5 optional). Plain Markdown content. Connected
agents read it and propose updates; users approve.

Strap is **not** a notes app, journal, chat memory store, or generic AI
wrapper. If a change would make it feel like one of those, it's the
wrong change.

---

## Stack

```
Next.js 16 (App Router, Turbopack)   React 19   TypeScript (strict)
Tailwind v4   shadcn/ui   Tiptap   Framer Motion / motion
Postgres 17 + Drizzle + Better Auth
```

---

## Repo layout

```
app/                Next routes
├── (strap-app)/    signed-in product: /file, /connections, /vault, /settings
├── api/app/        session-authed APIs (requireApiAuth)
│   ├── headless-access/  one-time-visible scoped agent keys
│   └── vault/      metadata, create, update, reveal, and delete operations
├── api/creed/*     token-authed agent APIs (hash compare)
├── authorize/      browser OAuth consent
├── device/         OAuth device authorization
├── auth/callback/  legacy auth landing; OAuth callbacks use /api/auth/callback/*
├── mcp/route.ts    MCP protocol endpoint
├── home/           public landing (/home)
├── docs|pricing|privacy|terms|stack/   marketing
├── onboarding/     guided onboarding flow
├── layout.tsx      root layout — skips loadCreedState for marketing
└── proxy.ts        sets x-request-id + x-pathname

components/
├── strap/          product UI (editor, sidebars, settings)
├── marketing/      public site
├── auth/           sign-in / landing-hero
└── ui/             shadcn primitives + animated icons

lib/
├── strap-data.ts             types, section IDs, accent maps, agent contract
├── strap-backend.ts          Drizzle domain reads/writes
├── strap-markdown.ts         Markdown ↔ section parser
├── rich-text.ts              Tiptap content normalization
├── quality-report.ts         read-only historical report compatibility
├── onboarding/                 deterministic setup and external-assistant prompts
├── db/                      database contexts and scoped repositories
├── auth/                    Better Auth server and client
├── authz/                   explicit row and mutation guards
├── secret-crypto.ts          AES-256-GCM token storage
├── headless-access.ts        scoped API-key creation and resolution
├── oauth-device.ts           device authorization grant lifecycle
├── api-key-vault.ts          authorized app-encrypted Vault operations
├── audit-log.ts              creed_audit_events writer
├── rate-limit.ts             per-token rate limiting
├── observability.ts          structured log helpers
├── api-auth.ts               requireApiAuth helper
└── branding.ts               env-driven contact / social URLs

db/schema/             canonical Drizzle schema
db/migrations/         squashed baseline and forward-only migrations
packages/strap/         primary @bvdm/strap CLI
packages/creed-cli/     preserved legacy CLI compatibility package
public/                 static assets
project-context/        gitignored — internal context pack (read this first)
```

The four "god" files to be careful in:
- `components/strap/file-screen.tsx` — the editor
- `lib/strap-backend.ts` — state loading and persistence
- `lib/strap-data.ts` — types + agent contract + seed
- `components/strap/settings-screen.tsx` — settings tabs

---

## Core invariants

These are non-negotiable. Don't cross them without asking.

1. **`requireApiAuth()` on every `/api/app/*` route.**
2. **Hashed-token verification on every `/api/strap/*`, `/api/creed/*`, and `/mcp` route.**
   Modern OAuth tokens and `strap_key_` API keys must also resolve an explicit
   profile grant and mode before MCP dispatch; `creed_key_` remains an accepted
   compatibility prefix.
3. **No personal info in source.** Email / handles / names go through
   `lib/branding.ts` env vars.
4. **Marketing routes never read user state.** The root layout skips
   `loadCreedState` based on the `x-pathname` header set by `proxy.ts`.
   Don't reintroduce a fan-out without that gate.
5. **Don't touch `lib/strap-data.ts:collaborationRules`** without
   thinking carefully — it ships to every connected agent on every
   read. Test across at least 2 models if you do.
6. **No em dashes in product copy** unless the user explicitly asked for
   them. Em dashes in code comments are fine.
7. **No `console.log` in committed code.** Use `lib/observability.ts`
   `log.info / warn / error` for server-side logging.
8. **No new dependencies without justification** in the commit message.
9. **TypeScript strict, no `any`.** `unknown` + narrowing instead.
10. **Default to server components.** Add `"use client"` only when a
    hook, browser API, or interactive event genuinely needs it.
11. **Secret plaintext stays inside its narrow reveal boundary.** Vault lists,
    logs, audits, and ordinary MCP responses contain metadata or references,
    never secret values.

---

## Working defaults

### Style + motion
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Durations: 160ms (popovers, dropdowns), 200ms (chevrons), 220-280ms (accordions).
- Tailwind v4 important syntax: **postfix** `text-red-500!`, not prefix.
- Inline `style` is acceptable when Tailwind merge isn't deduplicating
  arbitrary classes correctly.

### Fetches
- Server fetches in route handlers / server components.
- Client fetches go through `components/strap/settings-preload.ts`-style module
  singletons when state must survive navigation.
- No `next/dynamic({ ssr: false })` for heavy public-route components
  — known to hang in Next 16 dev.

### Database and environment
- .env.local is the canonical configuration for this checkout. Load it before local database commands and never print secrets.
- Use npm run db:up, npm run db:migrate and npm run test:db for local Postgres. See db/README.md.
- Keep viewer contexts and explicit authorization on session reads/writes. Service contexts are server-only, require a named purpose and retain domain role/credential guards.
- Preserve the existing token encryption key during data copies. Better Auth, Vault and maintenance have separate keys.
- Production provisioning, import and decommissioning require explicit authorization; local implementation does not authorize those operations. See db/README.md for cutover checks and rollback requirements.

### Animations
- `framer-motion` (older imports) and `motion/react` (newer) are the
  same library aliased. Match the surrounding file.
- Don't double up `layout` and `AnimatePresence mode="popLayout"` —
  pick one.
- Don't reintroduce `contentVisibility: auto`. It breaks the document
  `load` event.

### Images
- Default Next/Image quality (75) is fine for backgrounds. Don't use
  `quality={100}` without confirming `next.config.ts:images.qualities`
  allowlists it AND restarting the dev server.
- Marketing page MediaSlots show a clean placeholder card when an
  image file is missing — see the comment block at the top of
  `MediaSlot` in `components/marketing/below-hero-sections.tsx` for
  the canonical naming convention.

---

## Verification before claiming "done"

```bash
npm test
npx tsc --noEmit -p .   # zero new type errors
npm run lint            # zero new ESLint errors
npm run build           # production build must succeed
```

For CLI changes, run the affected package typecheck, tests, and package dry run; the root TypeScript project excludes CLI packages. For compatibility classification changes, review affected occurrences and run `npm run audit:brand`.

Report failed or unavailable checks accurately.

If you changed the schema, run `npm run db:migrate` and `npm run test:db` against local Postgres. Review the generated migration before deploying.

If you touched the agent contract, paste the universal connection
prompt into Claude Code or Codex and confirm the agent reads + proposes
a sample update.

---

## Reply style

- Lead with the answer or the action.
- One short paragraph of context, max.
- Bullet lists for multiple changes; prose for single changes.
- Quote file paths and identifiers in backticks.
- No emoji unless the user asked for them.
- No filler ("I hope this helps!", "Let me know if you need anything else").

---

## A word on legacy paths

The codebase pivoted from a developer-context product to Strap's personal-context
product. Some legacy code paths still reference the old framing —
`conventions` section ID, "operating principles" naming, chips/rules/
focus payload variants in the markdown parser.

Canonical implementation paths are `app/(strap-app)/`, `components/strap/`,
and `lib/strap-*`. Narrow `lib/creed-*` re-export shims, `/api/creed/**`,
database identifiers, migration history, and `packages/creed-cli/` remain
explicit compatibility surfaces.

When you find one of these, leave it alone unless you're explicitly
cleaning up legacy paths. Removing them too early breaks existing
imported user data. The plan is to gate them behind a feature flag
for one release, then drop in a follow-up.

---

If anything here conflicts with the code: **the code is canonical.**
Update this file in the same pass.

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
