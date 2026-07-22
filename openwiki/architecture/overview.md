# Architecture overview

## System boundaries

Creed is one Next.js deployment backed by Supabase and several external services. The code is organized by trust boundary more than by a formal layered framework.

```text
Browser
  ├─ public pages and onboarding ───────────────┐
  └─ authenticated app (/file, /connections,   │
      /vault, /settings) → session APIs         │
                                                ▼
Agent or creed-cli → OAuth 2.1 → /mcp → Next.js route handlers
Headless agent → device OAuth or Creed API key ─┘
Legacy agent client → capability bearer token → /api/creed/**
                                                │
                       ┌────────────────────────┼───────────────────────┐
                       ▼                        ▼                       ▼
                  Supabase                 OpenRouter                 GitHub
             auth, Postgres, RLS,       model inference,         file synchronization
             Vault, realtime            usage and cost
```

`proxy.ts` runs before dynamic routes. It assigns or forwards a bounded request ID, forwards `x-pathname`, and refreshes Supabase sessions only outside marketing routes. `app/layout.tsx` can use that pathname to avoid loading account state for public pages. Security and cache headers are configured in `next.config.ts`; user-specific HTML is `private, no-store`, while versioned assets are immutable.

## Web application flow

`app/(creed-app)/layout.tsx` is the authenticated product boundary. It:

1. Resolves the current Supabase user.
2. Requires either a Personal entitlement or Company Creed membership.
3. Requires a persisted Personal Creed for personal-only users.
4. Resumes unfinished company onboarding for company owners.
5. Loads the one-time welcome state for the active Creed.
6. Mounts `AuthedProviders`, the shell, and `/file`, `/connections`, `/vault`, or `/settings`.

The route pages are intentionally thin. Product orchestration is mostly in `components/creed/creed-provider.tsx`, `file-screen.tsx`, `connections-screen.tsx`, and settings components. Domain mapping and persistence live in `lib/`.

### Active Creed resolution

A user can own a Personal Creed and belong to Company Creeds. `lib/creed-context.ts` resolves one active Creed from the HTTP-only `creed_active` cookie, but treats the cookie as advisory. It revalidates live membership, then falls back to the Personal Creed or first available company. This prevents a stale cookie from retaining access after removal.

Use the specific helpers that match the operation:

- `resolveActiveCreed`: any active Creed and role.
- `resolveOwnedCompanyCreedId`: owner-only AI and company-management mutation paths.
- `resolveManagedCompanyCreedId`: owner/admin management such as GitHub.
- `resolveMemberCompanyCreed`: read-only company data for any member.
- `resolveMemberCompanyCreedById`: settings reads that must not depend on cookie timing.

## Persistence split

Personal and Company Creeds share domain shapes but not write mechanics.

### Personal

The client maintains an optimistic full state. Human edits are debounced and persisted through the Personal backend in `lib/creed-backend.ts`. Proposal resolution is partly server-durable and partly applied through the client’s subsequent full-state save, especially for structural changes.

### Company

Company writes are per-section, server-authoritative operations in `lib/company-sections.ts` and `app/api/app/sections/**`. The server checks live membership, role, section permission, and base revision before a service-role write. Realtime broadcasts plus bounded polling reconcile collaborators and agent-originated changes. Section versions support restore.

This separation is intentional. Reusing Personal full-state persistence for a Company Creed risks overwriting concurrent changes and bypassing application-level policy.

## API surfaces

| Surface | Authentication | Responsibility |
|---|---|---|
| `app/api/app/**` | Supabase session (`auth.getUser`) | Browser product operations, including headless-key and Vault management |
| `app/mcp/route.ts` | OAuth access token or `creed_key_` bearer | MCP tools, resources, prompts, scoped mutation, and usage attribution |
| `app/api/creed/**` | Hashed capability bearer tokens | Direct HTTP read, proposal, and write integrations |
| OAuth routes | Session during consent/device approval; PKCE or device-code exchange afterward | Discovery, registration, authorization, token rotation/revocation |

Browser route handlers should use `requireApiAuth()` or an equivalent helper that calls `auth.getUser()`. Service-role code bypasses RLS and must follow an explicit authorization check. Agent routes look up token hashes rather than comparing or querying plaintext credentials.

## Data and external service flow

- **Supabase session clients** perform user-scoped reads/writes under RLS.
- **Supabase admin clients** perform OAuth, company, and sensitive integration operations after app-level checks; Supabase Vault payload access is additionally confined to service-role-only definer RPCs.
- **OpenRouter** receives bounded Creed context and prompts for AI features. Responses are untrusted until parsed and validated.
- **GitHub** stores `creed.md`; tokens are encrypted, and push uses remote SHA optimistic concurrency.

See [Platform integrations](../integrations/platform-services.md) and [Schema and security](../data/schema-and-security.md) for these boundaries.

## Where to start for a change

- App access or switching: `app/(creed-app)/layout.tsx`, `lib/creed-context.ts`, `lib/creed-membership.ts`.
- Editor behavior: `components/creed/file-screen.tsx`, `rich-text-editor.tsx`, `creed-provider.tsx`, `lib/rich-text.ts`.
- Personal persistence: `lib/creed-backend.ts` and `app/api/app/state/route.ts`.
- Company mutation: `lib/company-sections.ts`, `lib/creed-permissions.ts`, section/proposal routes.
- Agent behavior and headless authentication: `lib/creed-data.ts`, `app/mcp/route.ts`, `lib/oauth.ts`, `lib/headless-access.ts`, `lib/oauth-device.ts`.
- Secret Vault: `lib/api-key-vault.ts`, `app/api/app/vault/**`, `components/creed/api-key-vault-screen.tsx`, and the latest migration.
- Public performance: `lib/marketing-routes.ts`, `proxy.ts`, root layout, `next.config.ts`.

Large orchestration files encode race handling and cross-feature assumptions. Follow their top-down types/helpers/consumer layout, and avoid local simplifications until the Personal/Company, optimistic/server, and human/agent paths are all understood.
