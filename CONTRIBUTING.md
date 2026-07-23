# Contributing to Strap

Strap is one compact context profile that connected AI agents read before meaningful work. It is not a notes app, chat log, memory dump, or generic AI wrapper. Changes should keep the profile current, specific, permission-aware, and worth reading.

Coding agents must also read [`AGENTS.md`](./AGENTS.md) before making changes.

## Before opening a pull request

1. Open an issue first for material changes.
2. Run the project locally and reproduce the behavior you are changing.
3. Read the complete path around the code, including callers, persistence, authorization, and tests.
4. Justify new dependencies in the pull request description.
5. Preserve stable internal Creed identifiers unless the change includes an approved compatibility migration.

## Verification

```bash
npm test
npx tsc --noEmit -p .
npm run lint
npm run build
```

If you change `packages/strap/`, also run:

```bash
npm --prefix packages/strap run typecheck
npm --prefix packages/strap test
npm --prefix packages/strap pack --dry-run
```

Exercise changed API routes locally and confirm relevant audit evidence. Supabase migrations require `npx supabase db reset` before pushing.

## Coding style

- Use strict TypeScript. Prefer `unknown` plus narrowing over `any`.
- Default to server components. Add `"use client"` only for hooks, browser APIs, or interaction.
- Do not use em dashes in product copy.
- Prefer existing CSS tokens such as `var(--creed-text-primary)` over one-off colors. Creed CSS tokens remain internal compatibility identifiers.
- Do not use `console.log` in committed code. Use `lib/observability.ts` for server logs.
- Every `/api/app/**` route uses `requireApiAuth()` unless explicitly and safely public.
- Agent routes preserve hashed-token or OAuth verification.

## Architecture map

- `app/(creed-app)/`: authenticated product routes.
- `app/api/app/**`: session-authenticated browser APIs.
- `app/api/creed/**` and `app/mcp/route.ts`: agent APIs with stable compatibility identifiers.
- `components/creed/**`: product UI.
- `components/marketing/**`: public Strap site.
- `lib/creed-data.ts`: shared types, sections, and connected-agent contract.
- `packages/strap/**`: new Strap CLI.
- `packages/creed-cli/**`: legacy CLI compatibility package.
- `supabase/migrations/**`: forward-only schema changes.

## Security

Do not open public vulnerability issues. Follow [`SECURITY.md`](./SECURITY.md).
