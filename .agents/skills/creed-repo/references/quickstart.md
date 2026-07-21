# Creed repository quickstart

Creed is a product for maintaining one curated context profile that multiple AI agents can read and improve. The profile is deliberately not a journal, chat history, or general notes store: it should remain compact, durable, specific, and useful enough for an agent to read before substantive work. Agents can read the profile, submit reviewable proposals, or edit directly where the user has granted that permission. The same model supports a single-user **Personal Creed** and a governed, shared **Company Creed**.

The repository contains the public site, authenticated web application, APIs, OAuth 2.1 and MCP server, Supabase schema, Stripe/OpenRouter/GitHub integrations, and a separately published `creed-cli` package.

## Start here

- [Architecture overview](architecture/overview.md): runtime boundaries, request/state flow, and where code belongs.
- [Creed domain model](domain/creed-model.md): sections, proposals, permissions, onboarding, review, and Personal versus Company behavior.
- [Agents, OAuth, MCP, and CLI](integrations/agents-and-oauth.md): how external agents authenticate and operate.
- [Platform integrations](integrations/platform-services.md): Supabase, OpenRouter, billing, credits, and GitHub sync.
- [Schema and security](data/schema-and-security.md): important tables, RLS, service-role boundaries, credentials, and migrations.
- [Testing and change guide](development/testing-and-change-guide.md): verification commands, high-risk paths, and test coverage.

## Technology and main surfaces

| Area | Implementation |
|---|---|
| Web | Next.js 16 App Router, React 19, strict TypeScript |
| UI | Tailwind CSS v4, shadcn-style primitives, Tiptap, Motion/Framer Motion |
| Backend | Supabase Auth, Postgres, RLS, realtime, scheduled retention |
| Agents | MCP protocol endpoint plus OAuth 2.1 dynamic registration and PKCE |
| AI | OpenRouter with platform credits or encrypted BYOK credentials |
| Billing | Stripe plans, company seats, top-ups, subscriptions, and webhooks |
| Version control | GitHub OAuth and `creed.md` push/pull |
| Terminal | Publishable Node 20+ package under `packages/creed-cli` |

The signed-in app is under `app/(creed-app)/` and exposes `/file`, `/connections`, and `/settings`. Session-authenticated browser APIs live in `app/api/app/`. Agent-facing APIs are the OAuth-protected `app/mcp/route.ts` and bearer-token `app/api/creed/**` routes. Public marketing, docs, pricing, legal, onboarding, auth, and OAuth endpoints live elsewhere under `app/`.

## Run locally

Prerequisites are Node.js 20+ and a Supabase project. OpenRouter is needed for AI features; Stripe and GitHub credentials are only needed for their respective flows.

```bash
npm install
cp .env.example .env.local
npx supabase link --project-ref <project-ref>
npx supabase db push
npm run dev
```

Populate the required placeholders described in `.env.example`; never commit or print `.env.local`. The minimum categories are the site URL, Supabase public URL/key, Supabase server secret, and Creed encryption secret. Use `npx supabase`, not an assumed global binary. The development server is available at `http://localhost:3000` by default.

Useful checks:

```bash
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
```

The CLI is an independent package with its own lifecycle:

```bash
npm --prefix packages/creed-cli test
npm --prefix packages/creed-cli run typecheck
```

For migration changes, also run `npx supabase db reset` against a local instance. Confirm the target project reference before any remote database operation.

## Repository orientation

- `app/`: pages, route handlers, OAuth endpoints, and MCP server.
- `components/creed/`: authenticated product UI. Several files are large orchestration components; read their full local flow before editing.
- `components/marketing/`: public-site UI.
- `lib/creed-data.ts`: shared domain types, section constants, proposal shapes, serialization, and the contract sent to agents.
- `lib/creed-backend.ts`: Personal Creed persistence and shared Supabase mapping.
- `lib/company-*.ts`: company administration, sections, billing, invites, and GitHub behavior.
- `lib/ai/`: OpenRouter calls, models, prompts, quality analysis, credits, and persistence.
- `lib/oauth.ts`: OAuth client, code, token, and grant persistence.
- `supabase/migrations/`: canonical, forward-only schema history.
- `packages/creed-cli/`: first-party MCP terminal client, built and tested independently.
- `tests/`: Node test suites, primarily pure logic and migration assertions.

Existing `README.md`, `CONTRIBUTING.md`, and `SECURITY.md` remain primary references for setup, contribution policy, and vulnerability reporting. Current source takes precedence where those documents lag recent Company, CLI, or test work.

## Core invariants

1. A Creed is curated context, not an append-only memory store.
2. Marketing routes must not trigger user-state loading. `proxy.ts` forwards `x-pathname` so layouts can preserve this boundary.
3. Browser APIs authenticate the Supabase user; agent APIs authenticate hashed bearer credentials.
4. Company access is always membership-, role-, section-, and billing-aware. An agent can never exceed its user’s permission.
5. Hidden sections never leave the server in member or agent payloads.
6. Personal and Company persistence are intentionally different: do not route shared company edits through Personal full-state autosave.
7. Supabase service-role clients bypass RLS. Every such call depends on explicit application authorization immediately beforehand.
8. Schema changes belong in migrations, with RLS and grants considered together.
9. `lib/creed-data.ts` agent instructions affect every connected agent and require unusually careful review.

## Current repository notes

At the documented HEAD, recent work hardened the CLI and MCP health attribution, polished editor/review and billing interactions, and corrected credential migration and hosted Data API grants. The working tree also contains unrelated user changes in root instruction/generated files; documentation initialization did not alter them.
