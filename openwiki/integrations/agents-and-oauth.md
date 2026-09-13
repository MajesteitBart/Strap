# Agents, OAuth, MCP, and CLI

## Connection and grant model

Strap’s MCP server at `/mcp` accepts:

- OAuth access tokens from dynamic-registration authorization-code flow with PKCE S256;
- OAuth access tokens from RFC 8628 device authorization;
- scoped API keys, newly `strap_key_` and compatibly existing `creed_key_`.

Modern credentials bind exactly one Personal or Company Strap plus a maximum access mode. Every call rechecks token/key validity, explicit grant, live membership, and section policy. Modes are ceilings:

- `read-only`: no proposal/direct mutation tools; visible sections clamp to read;
- `proposal-only`: proposals allowed where live policy permits, direct editing removed;
- `direct`: direct operations remain limited by live Personal policy or Company member/section permissions.

If a modern grant becomes inaccessible, MCP returns no usable Strap state rather than falling back. Only positively identified pre-explicit-grant OAuth tokens retain historical Personal fallback.

## OAuth authorization-code flow

The client discovers protected-resource and authorization-server metadata, dynamically registers, and starts `/authorize` with PKCE. The signed-in user selects exactly one accessible Personal or Company Strap; solo Personal users get the same one-profile grant without a picker. `/authorize/decision` revalidates session, client, redirect, membership, and selection before issuing a short-lived code. `/token` atomically claims the code, verifies PKCE/redirect, then issues one-hour access and rotating 30-day refresh tokens; `/revoke` supports revocation.

Browser consent does not expose a mode picker: it records a `direct` ceiling and relies on live section policy to narrow actual rights. Client identity is not inherently trusted; exact redirects, PKCE, user consent, explicit profile selection, and revocation are load-bearing.

## RFC 8628 device authorization

Discovery advertises `/device/authorize` and the device-code grant. A registered client receives a hash-at-rest device code, eight-character user code, `/device` verification URI, ten-minute lifetime, and initial five-second polling interval.

The signed-in user enters the code, verifies the client name, chooses exactly one Personal or Company Strap, and chooses a mode allowed by the requested scopes. Polling supports pending, `slow_down`, denial, expiry, client mismatch, and one-time consumption. Approval issues standard OAuth tokens with that single-Strap grant. Durable poll timing is serialized in Postgres; local endpoint limits remain process-local.

Primary sources: `app/device/**`, `lib/oauth-device.ts`, `lib/oauth-device-shared.ts`, and `app/token/route.ts`.

## One-time-visible API keys

`/connections` uses session APIs under `app/api/app/headless-access/**` to list safe metadata, create, and revoke keys. Any current Strap member can create a key for that Strap, with a name, explicit mode, and optional expiry no more than 366 days away.

`lib/headless-access-shared.ts` generates new `strap_key_` values from random material. Only SHA-256 digest and short display prefix persist; plaintext is returned once by creation and cannot be recovered. Existing `creed_key_` values are recognized solely as compatibility keys. Resolution checks revocation, expiry, creator membership, and records `last_used_at` best-effort.

## MCP canonical and compatibility contracts

`app/mcp/route.ts` supports JSON-RPC tools, resources, prompts, batching, CORS discovery, and MCP protocol `2025-06-18`. Discovery is Strap-first and advertises canonical names such as `list_straps`, `read_strap`, `strap_get_section`, `strap_search`, proposal/direct operations, and `strap://profile`.

Do not remove or rename the exact compatibility surface. The same dispatcher continues to accept:

- `list_creeds`, `read_creed`;
- `propose_creed_update`, `direct_edit_creed`;
- `creed_update_section`, `creed_create_section`, `creed_delete_section`;
- `creed_rename_section`, `creed_recolor_section`, `creed_append_to_section`;
- `creed_reorder_section`, `creed_get_section`, `creed_search`;
- `creed_get_recent_activity`, `creed_get_quality_report`;
- compatibility resource URI `creed://profile`.

Unprefixed stable operations such as `get_write_policy` and `list_sections` also remain. `/api/strap`, `/api/strap/proposals`, and `/api/strap/write` are the canonical direct HTTP paths. `/api/creed/**` remains only as a compatibility API shim; both route families share handler behavior, authentication, and rate limits.

The MCP operating contract tells agents to read Strap before meaningful work, propose only durable changes, prune rather than accumulate, and treat profile content as data rather than instructions. Changes in `lib/strap-data.ts` or `app/mcp/route.ts` affect every client; `lib/creed-data.ts` is only a deprecated compatibility re-export shim.

## Primary and legacy CLIs

`packages/strap` publishes `@bvdm/strap` and the `strap` executable for Node 20+. It defaults to `https://strap.bvdm.ai/mcp`, uses dynamic registration plus browser authorization-code PKCE, discovers tools/resources/prompts live, supports exact-name calls and JSON mode, stores credentials per server, and attempts RFC 7009 revocation on logout.

```bash
npx @bvdm/strap
strap tools
strap call read_strap
strap resource strap://profile
strap --agent codex call strap_search --args '{"query":"priorities"}' --json
```

Server precedence is `--server`, `STRAP_MCP_URL`, saved config, then the default; `STRAP_CONFIG_DIR` overrides storage. HTTPS is required except explicit localhost loopback URLs. The server supports device authorization and API keys, but current `packages/strap` source implements browser OAuth; do not document nonexistent CLI device/API-key login commands.

`packages/creed-cli` remains a complete, separately configured legacy compatibility package exposing `creed`/`creed-cli` and defaulting to `https://creed.md/mcp`. New users should use `@bvdm/strap`. Neither CLI reads or migrates the other’s credentials automatically.

## Security caveats and tests

Raw credentials never belong in logs, query strings, rate-limit identifiers, or docs. MCP hashes bearer values before rate limiting. `lib/rate-limit.ts` is process-local. Dynamic registration can accept supported custom schemes, so consent and redirects matter more than the displayed client name.

Relevant tests include `tests/strap-protocol-compatibility.test.ts`, `tests/headless-access-vault.test.ts`, `tests/mcp-connection-status.test.ts`, `tests/mcp-health-filter.test.ts`, `packages/strap/tests/**`, and `packages/creed-cli/tests/**`. Source-text assertions do not replace live OAuth, RPC concurrency, RLS, or MCP integration tests.
ration tests.
