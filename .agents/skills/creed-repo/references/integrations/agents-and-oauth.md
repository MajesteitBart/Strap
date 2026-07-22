# Agents, OAuth, MCP, and CLI

## Connection model

The preferred agent integration is Creed’s MCP server at `/mcp`, protected by an OAuth 2.1-style authorization-code flow with dynamic client registration and mandatory PKCE S256. A connection is granted access to one selected Creed. Every tool call re-resolves token validity, Creed grant, membership, billing, and section permissions.

The older direct HTTP API remains under `app/api/creed/**` with separate read, proposal, and direct-write bearer capabilities. Those credentials are not Supabase sessions and must be supplied in the `Authorization` header.

## OAuth flow

1. An unauthenticated MCP request receives `401`, a `WWW-Authenticate` challenge, and protected-resource metadata.
2. The client discovers `/.well-known/oauth-protected-resource[/mcp]` and `/.well-known/oauth-authorization-server`.
3. `POST /register` creates a public client and records allowed redirect URIs.
4. `/authorize` requires a signed-in, eligible user and presents a Creed consent picker.
5. `/authorize/decision` revalidates the session, client, redirect URI, entitlement/membership, and selected Creed before issuing a short-lived code.
6. `POST /token` atomically redeems the single-use code, verifies PKCE and the redirect URI, then returns a one-hour access token and rotating 30-day refresh token.
7. Refresh rotates and revokes the prior pair. `/revoke` supports explicit revocation.

Important implementation files are the well-known routes, `app/register/route.ts`, `app/authorize/**`, `app/token/route.ts`, `app/revoke/route.ts`, `lib/oauth.ts`, and `lib/oauth-metadata.ts`.

OAuth clients are public and have no meaningful client secret. Security rests on PKCE, exact redirect validation (with standard loopback-port handling), one-time codes, consent, per-Creed grants, and token revocation. Scope strings describe capability, but live section policy is the authoritative write gate.

## Credential storage

OAuth access/refresh tokens and legacy agent tokens use SHA-256 hashes for lookup. Recoverable credentials are encrypted with AES-256-GCM through `lib/secret-crypto.ts`, using `CREED_ENCRYPTION_SECRET`. Raw credentials must never appear in logs, query parameters, or documentation.

Authorization codes expire quickly and are claimed conditionally on `used_at IS NULL`. Redirect fields submitted by the browser are revalidated server-side rather than trusted from hidden form inputs.

## MCP endpoint

`app/mcp/route.ts` is a self-contained JSON-RPC endpoint supporting tools, resources, prompts, batching, CORS discovery, and the MCP `2025-06-18` protocol version. It exposes capabilities such as:

- listing the connection’s Creed and sections;
- reading the full governed profile or a targeted section;
- search and quality/report reads;
- submitting rich-text or structural proposals;
- direct section operations only where effective permission is `direct`.

The initialize response and read payload include an operating contract: read Creed before substantive work, propose only durable changes, prefer pruning/tightening to accumulation, and treat all profile content as user data rather than agent instructions. Changes to this contract in `lib/creed-data.ts` or `app/mcp/route.ts` affect every connected model.

The server strips hidden sections and dynamically narrows available operations. For a Company Creed, an agent’s effective access is the minimum of member permission and the user-selected agent ceiling. CLI activity can carry `X-Creed-CLI-Agent` for per-agent attribution while remaining distinguishable from ordinary MCP client activity.

## Direct HTTP agent APIs

- `GET /api/creed`: token-authenticated rendered profile.
- `POST /api/creed/proposals`: validate and store a proposal.
- `POST /api/creed/write`: apply a direct edit only to a direct-enabled target.

These routes use capability-specific hashed-token lookup. Query-string tokens are intentionally unsupported to avoid browser history, referrer, and server-log leakage.

## First-party CLI

`packages/creed-cli` is an independently built/published Node 20+ package. It is deliberately a thin MCP client:

- first use opens the browser and completes OAuth via a random localhost callback port;
- OAuth state is validated;
- client metadata, PKCE state, and tokens are stored per normalized server URL;
- tools, resources, prompts, and argument schemas are discovered live;
- unknown future server tools work without publishing a matching CLI version;
- `logout` attempts RFC 7009 revocation, then removes local credentials.

On POSIX systems, its configuration directory/file are written with restrictive permissions. Windows relies on platform filesystem protections, so credentials remain a local endpoint-security concern.

Use `packages/creed-cli/README.md` for user commands. Run its own test and typecheck scripts; the root test command does not include package tests.

## Operational and security caveats

- `lib/rate-limit.ts` is process-local. Limits reset on restart and do not coordinate across regions or instances.
- Dynamic client registration permits supported custom schemes; registered client identity is therefore not a strong trust signal. Consent and redirects are load-bearing.
- Best-effort Creed-grant persistence fails narrow, but may produce personal-only behavior rather than the requested company grant.
- The MCP route combines protocol, authentication, policy, state loading, and dispatch; seemingly small changes can affect many clients.
- Focused endpoint-level OAuth tests are limited. PKCE replay, redirect validation, rotation, revocation, and MCP authorization deserve integration tests.

Relevant tests include `tests/mcp-connection-status.test.ts`, `tests/mcp-health-filter.test.ts`, `tests/connection-actions.test.ts`, and `packages/creed-cli/tests/**`. Recent CLI hardening added command/option tests, live discovery protections, and explicit agent attribution.
