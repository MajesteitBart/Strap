# Architecture overview

## System boundaries

Strap is a Next.js deployment backed by Supabase, OpenRouter, and GitHub. The code is organized mainly by trust boundary. Creed-named modules and routes remain where they are stable internal or compatibility contracts.

```text
Browser
  ├─ public pages and onboarding ───────────────┐
  └─ signed-in app (/file, /connections,        │
      /vault, /settings) → app/api/app/**        │
                                                ▼
Agent or Strap CLI → browser/device OAuth → /mcp → Next.js route handlers
Headless agent → scoped Strap API key ──────────┘
Compatibility client → capability bearer → /api/creed/**
                                                │
                    ┌───────────────────────────┼──────────────────┐
                    ▼                           ▼                  ▼
                Supabase                   OpenRouter            GitHub
        Auth, Postgres, RLS, Vault,       model inference      profile sync
             and realtime
```

`proxy.ts` forwards a bounded request ID and `x-pathname`, and refreshes Supabase sessions only outside marketing routes. `app/layout.tsx` uses the pathname to avoid loading account state on public pages. `next.config.ts` sets security and cache headers; user-specific HTML is private/no-store.

## Signed-in application

`app/(strap-app)/layout.tsx` is the authenticated product boundary. It resolves the Supabase user, a persisted Personal Strap or live Company membership, unfinished Company onboarding, and one-time welcome state before mounting `AuthedProviders` and the product shell. There is no paid-plan or Stripe gate.

The route pages are thin. Product orchestration is concentrated in `components/strap/strap-provider.tsx`, `file-screen.tsx`, `connections-screen.tsx`, and settings components. Domain mapping and persistence live in canonical `lib/strap-*` implementations; old `lib/creed-*` modules are deprecated compatibility re-export shims.

### Active Strap resolution

A user can own a Personal Strap and belong to Company Straps. `lib/strap-context.ts` resolves one active record from the HTTP-only `creed_active` cookie, but revalidates live membership and falls back to Personal or the first accessible Company. The cookie is advisory, not authorization.

Use the operation-specific helpers (`resolveActiveCreed`, `resolveOwnedCompanyCreedId`, `resolveManagedCompanyCreedId`, and member resolvers) rather than trusting a caller-provided ID.

## Persistence split

Personal and Company share domain shapes but not write mechanics.

- **Personal:** the client keeps optimistic full state; human edits are debounced through `lib/strap-backend.ts`. Some structural proposal results become durable through the next full-state save.
- **Company:** `lib/company-sections.ts` and `app/api/app/sections/**` perform per-section, server-authoritative writes after membership, role, permission, and base-revision checks. Realtime plus bounded polling reconcile collaborators; versions support restore.

Reusing Personal full-state persistence for Company can overwrite concurrent work and bypass policy.

## API and protocol surfaces

| Surface | Authentication | Responsibility |
|---|---|---|
| `app/api/app/**` | Supabase session (`auth.getUser`) | Browser product operations, including headless keys and Vault |
| `app/mcp/route.ts` | OAuth, new `strap_key_`, or accepted legacy `creed_key_` bearer | MCP tools/resources/prompts and permission-scoped mutations |
| `app/api/strap/**` | Hashed capability bearer | Canonical direct HTTP read, proposal, and write APIs |
| `app/api/creed/**` | Hashed capability bearer | Compatibility API shims for direct HTTP clients |
| OAuth/device routes | Session for approval; PKCE or device code for exchange | Registration, consent, grants, token rotation/revocation |

MCP discovery is Strap-first: tools are returned as `strap_*`/`read_strap` names and the canonical profile resource is `strap://profile`. Exact Creed tool names and `creed://profile` remain callable/readable compatibility aliases.

## Authorization flow

Modern OAuth tokens and API keys resolve exactly one explicit Personal or Company grant. Browser consent writes a `direct` grant but still depends on live section permissions. Device OAuth and API-key creation expose `read-only`, `proposal-only`, and `direct` maximum modes. The mode is only a ceiling:

- read-only removes mutation capability and clamps visible sections to read;
- proposal-only removes direct edits and clamps to propose;
- direct still cannot exceed live membership, member agent ceiling, or section permission.

If a modern explicit grant becomes inaccessible, MCP produces an empty write-less state. Only tokens positively marked as legacy and lacking grant rows may use historical Personal fallback.

## Data and external-service boundaries

- Session Supabase clients operate under RLS.
- Admin clients perform OAuth, Company, and sensitive integration operations only after application authorization.
- `/vault` metadata lives in `public.creed_vault_items`; payloads are at rest in Supabase Vault. Plaintext crosses Next.js/server memory only for create or rotation inputs and explicit reveal output through service-role-only RPCs.
- OpenRouter receives bounded profile context and prompts; outputs are untrusted until parsed and validated.
- GitHub defaults new integrations to `strap.md`. Reading configured `strap.md` may fall back to `creed.md`, but push never creates a competing new file beside that fallback.

## Where to start for changes

- App access/switching: `app/(strap-app)/layout.tsx`, `components/strap/strap-switcher.tsx`, `lib/strap-context.ts`, `lib/strap-membership.ts`, and `app/api/app/straps/**`.
- Editing: `components/strap/file-screen.tsx`, `components/strap/strap-provider.tsx`, `lib/rich-text.ts`.
- Company mutation: `lib/company-sections.ts`, `lib/strap-permissions.ts`, section/proposal routes.
- Agent access: `app/mcp/route.ts`, `lib/oauth.ts`, `lib/oauth-device.ts`, `lib/headless-access.ts`.
- Vault: `lib/api-key-vault.ts`, `app/api/app/vault/**`, `components/strap/api-key-vault-screen.tsx`, relevant migrations.
- Profile files: `lib/profile-file.ts`, GitHub version-control modules/routes, `20260724120000_strap_profile_defaults.sql`.
- Public product/pricing: `lib/marketing/brand.ts`, `lib/marketing/pricing.ts`, marketing components.

Large orchestration files encode race handling and cross-feature assumptions. Read the complete Personal/Company, human/agent, and optimistic/server flow before simplifying them.
