# AGENTS.md

You're an AI coding agent picking up the Creed codebase. This file is the
short version of `README.md` + `CONTRIBUTING.md` written for you.

If a human is reading this, the document you want is [`README.md`](./README.md).

---

## Start Here

Before making changes, read current repository truth in this order:

1. `README.md`
2. `BOOTSTRAP.md`
3. `.project/context/README.md` and the task-relevant context files
4. The active contract under `.project/projects/`
5. `openwiki/quickstart.md` and its task-relevant references
6. The complete code path you intend to change

First-turn workflow:

1. Inspect `git status` and preserve unrelated worktree changes.
2. Retrieve the relevant product, architecture, security, and delivery context.
3. Select or create the narrowest Delano task that represents the requested work.
4. Implement the smallest coherent change while preserving the invariants below.
5. Run focused checks, then the repository-wide checks required by the changed surface.
6. Record evidence in `.project/projects/<slug>/` and update `.project/context/` when durable truth changed.

## Project Mission

Keep one compact, curated personal context profile useful and safe across every connected AI agent. Product quality is measured by whether the profile stays current, specific, permission-aware, and worth reading before substantive work.

## Current Implementation Goal

Use Delano as Creed's local delivery contract and runtime without changing the product architecture or turning `.project` into product data. The first tracked project is `.project/projects/delano-bootstrap/`.

## Source Of Truth

- `README.md`: product purpose, confirmed setup, commands, and repository map.
- `BOOTSTRAP.md`: repeatable Delano setup and retrofit decisions for this repository.
- `.project/context/`: distilled product, technical, testing, and delivery context.
- `.project/projects/`: Delano specs, plans, decisions, workstreams, tasks, research, and updates.
- `openwiki/`: generated architecture and workflow reference; regenerate it rather than hand-editing generated pages.
- `app/`, `components/`, `lib/`, `supabase/`, `packages/creed-cli/`, and `tests/`: implemented behavior and canonical executable truth.
- `.agents/`: canonical Delano runtime and repo-local skills. `.claude/` is compatibility only.

---

## What Creed is

One personal context profile every AI reads before answering the user.
10 sections (5 always-on, 5 optional). Plain Markdown content. Connected
agents read it and propose updates; users approve.

Creed is **not** a notes app, journal, chat memory store, or generic AI
wrapper. If a change would make it feel like one of those, it's the
wrong change.

---

## Stack

```
Next.js 16 (App Router, Turbopack)   React 19   TypeScript (strict)
Tailwind v4   shadcn/ui   Tiptap   Framer Motion / motion
Supabase (Postgres + RLS + auth)   OpenRouter (included key + BYOK)
```

---

## Repo layout

```
app/                Next routes
├── (creed-app)/    signed-in product: /file, /connections, /settings
├── api/app/        session-authed APIs (requireApiAuth)
├── api/creed/*     token-authed agent APIs (hash compare)
├── auth/callback/  OAuth callback
├── mcp/route.ts    MCP protocol endpoint
├── home/           public landing (/home)
├── docs|pricing|privacy|terms|stack/   marketing
├── onboarding/     guided onboarding flow
├── layout.tsx      root layout — skips loadCreedState for marketing
└── proxy.ts        sets x-request-id + x-pathname

components/
├── creed/          product UI (editor, sidebars, settings)
├── marketing/      public site
├── auth/           sign-in / landing-hero
└── ui/             shadcn primitives + animated icons

lib/
├── creed-data.ts             types, section IDs, accent maps, agent contract
├── creed-backend.ts          Supabase reads/writes
├── creed-markdown.ts         Markdown ↔ section parser
├── rich-text.ts              Tiptap content normalization
├── ai/quality{,-runner,-rubric}.ts   quality analysis
├── ai/openrouter.ts          OpenRouter call helper (included key + BYOK)
├── ai/model-catalog.ts       OpenRouter model list + tier scoring
├── onboarding/{compile,refine,validate}.ts   synthesizer pipeline
├── supabase/{server,browser,admin}.ts        per-runtime clients
├── secret-crypto.ts          AES-256-GCM token storage
├── audit-log.ts              creed_audit_events writer
├── rate-limit.ts             per-token rate limiting
├── observability.ts          structured log helpers
├── api-auth.ts               requireApiAuth helper
└── branding.ts               env-driven contact / social URLs

supabase/migrations/    canonical schema (forward-only, idempotent)
public/                 static assets
project-context/        gitignored — internal context pack (read this first)
```

The four "god" files to be careful in:
- `components/creed/file-screen.tsx` (~2700L) — the editor
- `lib/creed-backend.ts` (~1750L) — Supabase glue
- `lib/creed-data.ts` (~1620L) — types + agent contract + seed
- `components/creed/settings-screen.tsx` (~1570L) — settings tabs

---

## Reading order before edits

1. `project-context/index.md` (gitignored — exists locally for the maintainer
   and any agent working in the repo)
2. The other files in `project-context/` listed by `index.md`
3. The exact code path you're about to change

If `project-context/` is missing (you cloned a public copy without it),
read `README.md` + `CONTRIBUTING.md` + `SECURITY.md` and then this file
end-to-end.

---

## Core invariants

These are non-negotiable. Don't cross them without asking.

1. **`requireApiAuth()` on every `/api/app/*` route.**
2. **Hashed-token verification on every `/api/creed/*` and `/mcp` route.**
3. **No personal info in source.** Email / handles / names go through
   `lib/branding.ts` env vars.
4. **Marketing routes never read user state.** The root layout skips
   `loadCreedState` based on the `x-pathname` header set by `proxy.ts`.
   Don't reintroduce a fan-out without that gate.
5. **Don't touch `lib/creed-data.ts:collaborationRules`** without
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

---

## Working defaults

### Delano workflow

- Use `.project/context/` for durable repository context and `.project/projects/` for bounded delivery contracts.
- Prefer Delano CLI lifecycle commands over hand-editing contract frontmatter so rollups remain consistent.
- Use the full discovery, planning, breakdown, execution, quality, and closeout flow for features or material contract changes.
- For small local fixes, inspect current state, make the smallest coherent change, verify narrowly, and report `done`, `partial`, or `blocked`.
- Do not mark work complete without concrete evidence. External tracker synchronization requires explicit approval before writes.

Common commands:

```bash
delano help
delano status --open --brief
delano validate
delano next -- --all
delano viewer
delano project show <project-slug> --json
delano workstream show <project-slug> <workstream-id> --json
delano task open|start|close|block|defer|update <project-slug> <task-id> --reason "<text>"
delano update add <project-slug> --message "<text>" --task <task-id> --stream <workstream-id>
```

### Model selection for workflows and subagents

Rankings are higher = better. Cost reflects what the project owner pays; intelligence is unsupervised problem capacity; taste covers UI/UX, code quality, API design, and copy.

| model | cost | intelligence | taste |
| --- | --- | --- | --- |
| gpt-5.5 | 9 | 8 | 5 |
| sonnet-5 | 5 | 5 | 7 |
| opus-4.8 | 4 | 7 | 8 |
| fable-5 | 2 | 9 | 9 |

- These are defaults, not limits. Escalate when output does not meet the quality bar.
- For anything that ships, use intelligence, then taste, then cost as tie-breakers.
- Use `gpt-5.5` for bulk or mechanical work. Anything user-facing needs taste >= 7.
- Use `fable-5` or `opus-4.8` for plan or implementation review, optionally with `gpt-5.5` as an independent perspective.
- Never use Haiku.
- Do not spawn subagents unless the user explicitly requests them.

### Style + motion
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Durations: 160ms (popovers, dropdowns), 200ms (chevrons), 220-280ms (accordions).
- Tailwind v4 important syntax: **postfix** `text-red-500!`, not prefix.
- Inline `style` is acceptable when Tailwind merge isn't deduplicating
  arbitrary classes correctly.

### Fetches
- Server fetches in route handlers / server components.
- Client fetches go through `lib/ai/quality-runner.ts`-style module
  singletons when state must survive navigation.
- No `next/dynamic({ ssr: false })` for heavy public-route components
  — known to hang in Next 16 dev.

### Supabase CLI + environment
- Always invoke the Supabase CLI through `npx supabase`; do not rely on a
  globally installed `supabase` binary.
- `.env.local` is the canonical source for this checkout's Supabase instance
  values. Load it into the current process before commands or scripts that
  access the configured instance, and never print secret values in logs or
  replies. Do not silently use credentials inherited from another shell or
  checkout.
- App/API checks use `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` from
  `.env.local`. Supabase management commands such as `npx supabase link` and
  `npx supabase db push` additionally require CLI credentials (normally
  `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`); keep those in
  `.env.local` too, never in source.
- Use `npx supabase db reset` for local migration verification. Before any
  remote migration command, confirm the project ref derived from
  `NEXT_PUBLIC_SUPABASE_URL` matches the intended instance.

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
npx tsc --noEmit -p .   # zero new type errors
npm run lint            # zero new ESLint errors
npm run build           # production build must succeed
```

If you touched a Supabase migration, `npx supabase db reset` against a
local Supabase before pushing — schema-only PRs that haven't been
applied will not be merged.

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

## When you finish a task

Decide:
- Did I learn something durable about the product, architecture, or
  repo conventions? → update the relevant file in `project-context/`.
- Did I leave the code worse in some small way (a `TODO`, a duplicated
  helper, a missing edge case)? → fix it now or call it out.
- Did I create a new file or pattern? → make sure it's discoverable
  (sensible name, top-of-file comment, exported from where it should
  be).

If all three are "no", just stop. Don't add a postscript.

---

## What "done" looks like

- TypeScript clean.
- No new ESLint errors (warnings on pre-existing patterns are fine).
- The user's intent is met.
- The codebase is no worse than before — and ideally a little better.

---

## A word on legacy paths

Creed pivoted from a developer-context product to a personal-context
product. Some legacy code paths still reference the old framing —
`conventions` section ID, "operating principles" naming, chips/rules/
focus payload variants in the markdown parser.

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

Run OpenWiki manually to refresh the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
