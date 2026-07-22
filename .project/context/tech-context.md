# Tech Context

## Stack
- Next.js 16 App Router with Turbopack, React 19, and strict TypeScript.
- Tailwind CSS v4, shadcn-style primitives, Tiptap, Framer Motion and `motion/react`.
- Supabase Auth and Postgres with RLS, realtime, migrations, and scheduled retention.
- Node 20+ application and `node:test` test suite; a separately published Node CLI lives in `packages/creed-cli/`.

## Runtime Constraints
- `.env.local` is the canonical configuration for this checkout and must never be printed or committed.
- Use `npx supabase`; confirm the project reference before remote management commands.
- Default to server components. Client components require a hook, browser API, or interactive event.
- Marketing rendering must preserve the `x-pathname` gate and avoid user-state fan-out.
- TypeScript stays strict with no `any`; server logging uses `lib/observability.ts` rather than `console.log`.

## Integration Points
- Supabase for auth, persistence, RLS, realtime, and scheduled jobs.
- OpenRouter for AI synthesis and quality features, including encrypted BYOK and platform-credit paths.
- Stripe for subscriptions, seats, top-ups, and billing webhooks.
- GitHub OAuth and repository APIs for `creed.md` synchronization.
- OAuth 2.1, MCP, bearer-token Creed APIs, and `packages/creed-cli/` for agent connectivity.
- Delano uses `.project/` as delivery truth, `.agents/` as its canonical runtime, and `.codex/hooks.json` as an opt-in session hook.
