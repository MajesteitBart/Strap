# Agents, OAuth, MCP, and CLI

## Connection model

Creed’s MCP server at `/mcp` accepts three bearer-credential families:

- OAuth access tokens issued through the browser authorization-code flow with dynamic registration and mandatory PKCE S256;
- OAuth access tokens issued through the RFC 8628 device authorization grant for headless clients;
- user-created Creed API keys whose `creed_key_` prefix identifies the credential type.

Modern OAuth connections and API keys are explicitly bound to one selected Creed and a maximum mode. Every tool call re-resolves credential validity, the explicit Creed grant, live membership, and section permissions. The older direct HTTP API remains under `app/api/creed/**` with separate read, proposal, and direct-write bearer capabilities. None of these credentials are Supabase browser sessions, and all must be supplied in the `Authorization` header.

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

## RFC 8628 device authorization

OAuth discovery advertises `/device/authorize` and `urn:ietf:params:oauth:grant-type:device_code`. A registered public client posts its `client_id` and optional scope to `/device/authorize`; Creed returns a hashed-at-rest device code, an eight-character user code, `/device` as the verification URI, a 10-minute lifetime, and an initial five-second poll interval. The signed-in user enters the code at `/device`, verifies the registered client name, selects exactly one accessible Creed and a maximum mode, then allows or denies the request.

The client polls `/token` with the device-code grant. Postgres serializes polling and state changes through service-role-only RPCs: a normal pending poll advances the next deadline, an early poll returns `slow_down` and adds five seconds up to 300, approval consumes the request once, and denial/expiry/client mismatch return OAuth errors. Successful exchange issues the same one-hour access and rotating 30-day refresh tokens as the browser flow, with one explicit Creed grant. The device request is consumed before token persistence, so the flow must not be described as one transaction spanning request consumption and token issuance.

`app/device/**`, `lib/oauth-device.ts`, `lib/oauth-device-shared.ts`, `app/token/route.ts`, and the latest headless-access migration implement this flow. Authorization and verification endpoint limits use the process-local limiter; durable poll timing is shared in Postgres.

## Credential storage

OAuth access/refresh tokens and legacy agent tokens use SHA-256 hashes for lookup. Recoverable credentials are encrypted with AES-256-GCM through `lib/secret-crypto.ts`, using `CREED_ENCRYPTION_SECRET`. Device and user codes are hash-only. Creed API keys are also hash-only and cannot be recovered after their one-time display. Raw credentials must never appear in logs, query parameters, rate-limit identifiers, or documentation.

Authorization codes expire quickly and are claimed conditionally on `used_at IS NULL`. Redirect fields submitted by the browser are revalidated server-side rather than trusted from hidden form inputs.

## Creed API keys for headless MCP

The Connections screen manages long-lived, one-time-visible API keys through the session-authenticated app API:

- `GET /api/app/headless-access?creedId=…` lists only the current user’s safe metadata;
- `POST /api/app/headless-access` creates a named key, a `read-only`, `proposal-only`, or `direct` ceiling, and an optional future expiry no more than 366 days away;
- `DELETE /api/app/headless-access/[id]` immediately revokes a key owned by the signed-in user.

Any current Creed member can create a key for that Creed. The generated value is `creed_key_` plus random material; only its SHA-256 digest and display prefix are stored. The full key is returned only by creation. MCP rechecks revocation, expiry, and the creator’s live membership on every resolution and updates `last_used_at` best-effort.

The key mode is an additional ceiling, never an elevation: read-only removes proposal/direct mutation tokens and clamps visible sections to read; proposal-only removes direct editing and clamps to propose; direct still obeys the user’s company and section permissions. If an explicit key or modern OAuth grant becomes inaccessible, MCP returns no usable Creed state rather than silently falling back to another Creed. Only positively identified legacy OAuth tokens with no explicit-grant marker retain the historical Personal fallback. `lib/headless-access.ts`, `lib/headless-access-shared.ts`, the app routes, and `components/creed/headless-access-card.tsx` are the primary sources.

## MCP endpoint

`app/mcp/route.ts` is a self-contained JSON-RPC endpoint supporting tools, resources, prompts, batching, CORS discovery, and the MCP `2025-06-18` protocol version. It exposes capabilities such as:

- listing the connection’s Creed and sections;
- reading the full governed profile or a targeted section;
- search and quality/report reads;
- submitting rich-text or structural proposals;
- direct section operations only where effective permission is `direct`.

The initialize response and read payload include an operating contract: read Creed before substantive work, propose only durable changes, prefer pruning/tightening to accumulation, and treat all profile content as user data rather than agent instructions. Changes to this contract in `lib/creed-data.ts` or `app/mcp/route.ts` affect every connected model.

The server strips hidden sections and dynamically narrows available operations. For a Company Creed, an agent’s effective access is the minimum of member permission and the credential’s selected ceiling. MCP classifies only `creed_key_` credentials as API keys; every other bearer follows OAuth resolution. It hashes the bearer before using it as a rate-limit identifier, so the in-memory limiter does not retain raw credentials. CLI activity can carry `X-Creed-CLI-Agent` for per-agent attribution while remaining distinguishable from ordinary MCP client activity.

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
- Modern credentials fail narrow when their explicit Creed grant is absent or inaccessible; do not restore Personal fallback outside the marked legacy-token case.
- The MCP route combines protocol, authentication, policy, state loading, and dispatch; seemingly small changes can affect many clients.
- Focused endpoint-level OAuth tests are limited. PKCE replay, redirect validation, rotation, revocation, device polling/token-issuance failure, and MCP authorization deserve integration tests.

Relevant tests include `tests/headless-access-vault.test.ts`, `tests/mcp-connection-status.test.ts`, `tests/mcp-health-filter.test.ts`, `tests/connection-actions.test.ts`, and `packages/creed-cli/tests/**`. The headless test covers key/code helpers and source-level enforcement/discovery assertions; it does not execute the routes, RPC concurrency, or live MCP authorization.
