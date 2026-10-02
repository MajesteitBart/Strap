# Strap secrets for Varlock

`@bvdm/varlock-strap-plugin` resolves selected Strap Vault items into your application's environment. Secret values stay out of `.env.schema`; Varlock fetches them when you run your application.

Requires Node.js 22+, Varlock 1.19.x, and a Strap deployment with the `db/migrations/0001_headless_vault_item_grants.sql` migration and reveal endpoint. Apply it with `npm run db:migrate` before deploying the application.

## Install

In the application that will consume secrets:

```sh
npm install varlock@^1.19.0 @bvdm/varlock-strap-plugin
```

## Build a local package

From the Strap checkout:

```sh
npm ci --prefix packages/varlock-strap-plugin
npm pack ./packages/varlock-strap-plugin
```

In the application that will consume secrets:

```sh
npm install varlock@^1.19.0 /path/to/bvdm-varlock-strap-plugin-0.1.1.tgz
```

You can also build the package and copy `dist/plugin.cjs` into your application, then use `# @plugin(./plugin.cjs)` in the schema. The bundle has no runtime dependencies beyond Varlock's plugin API.

## Set up Strap

1. Add the secret in Strap's **Vault**, optionally in a folder such as one per application. Use **Copy reference** on its row to copy `secret://<item-uuid>`, or run `strap vault schema --folder <name>` to print the schema lines.
2. Open **Connections → Headless access**. Name a new key and choose its expiry. Use **Read only** if you only need secrets and profile reads.
3. Under **Secret access for Varlock**, select the folders and individual secrets this key may reveal. Copy the resulting key when it is shown once.
4. Supply the key as `STRAP_API_KEY` through your shell, CI secret store, or a gitignored local environment file. Keep it out of your schema and source control.

A folder grant covers every secret currently in that folder, including secrets added after the key was created. Moving a secret out of the folder, or deleting the folder, removes that access on the next reveal. Individual grants keep working wherever the secret sits.

Keys start without secret access. Use the shield icon on a key in Connections to change its folders and secrets; the key value stays the same. Use the rotate icon to replace the key value while keeping its name, mode, expiry and grants; the old value stops working at once. Context modes control profile editing; secret access is a separate permission and works with any mode. Company owners and admins can authorize secrets. Every reveal rechecks that role and live membership.

## Configure Varlock

Create `.env.schema` in your application:

```dotenv
# @plugin(@bvdm/varlock-strap-plugin)
# @initStrap(token=$STRAP_API_KEY)
# ---

# @type=strapAccessKey @required
STRAP_API_KEY=

# @sensitive @required
DATABASE_URL=strap("secret://11111111-1111-4111-8111-111111111111")
```

Replace the sample reference with the one copied from your Vault. Then run:

```sh
npx varlock load
npx varlock run -- node app.js
```

`strapAccessKey` marks the bootstrap credential sensitive and internal, so Varlock does not inject it into the child process. `strap()` implies sensitivity even when `@defaultSensitive=false`. Keep the explicit `@sensitive` annotation in schemas for readability; do not override it with `@sensitive=false`.

`varlock run` gives the launched process the resolved secrets. Use Varlock's [credential proxy](https://varlock.dev/guides/proxy/) when a process should receive placeholders instead; this provider itself is a runtime secret loader.

## Self-hosting and multiple profiles

The default server is `https://strap.bvdm.ai`. Set `server` to the origin of a deployment running this feature. HTTPS is required, except for `http://localhost`, `http://127.0.0.1`, and `http://[::1]` during development. Paths, embedded credentials, queries, fragments, and redirects are rejected.

```dotenv
# @plugin(@bvdm/varlock-strap-plugin)
# @initStrap(id=personal, token=$PERSONAL_KEY, server=https://strap.example.com)
# @initStrap(id=company, token=$COMPANY_KEY, server=https://strap.example.com)
# ---

# @type=strapAccessKey @required
PERSONAL_KEY=
# @type=strapAccessKey @required
COMPANY_KEY=

# @sensitive @required
PERSONAL_TOKEN=strap(personal, "secret://11111111-1111-4111-8111-111111111111")
# @sensitive @required
COMPANY_TOKEN=strap(company, "secret://22222222-2222-4222-8222-222222222222")
```

`strap(reference)` uses the unnamed instance; `strap(instanceId, reference)` selects a named one. A bare item UUID is also accepted. References are IDs, never names, so renaming a secret cannot break a schema or point it at a different secret; use `strap vault list` or `strap vault schema` to look up references by name. Field paths, bulk export and profile-wide wildcard grants are intentionally unsupported; folders are the bounded way to grant a group. Rotating a secret keeps the item ID, so subsequent loads receive the new value. Deleting and recreating an item creates a new ID: update the schema, and grant it again unless it sits in a granted folder.

## Reveal contract

The plugin sends `POST /api/strap/vault/reveal` with an `Authorization: Bearer <key>` header and `{"reference":"secret://<uuid>"}` body. A successful response contains only `{"secret":"..."}`. All responses use private/no-store caching. Each successful reveal requires a persisted `vault.secret_revealed` audit event containing the item ID, profile ID and key ID, plus the folder ID when a folder grant allowed it, never plaintext.

The plugin does not cache, log, retry, or write fetched values to disk. Each resolution makes a fresh request with a 15-second timeout. Varlock or the launched application may retain resolved environment values for that process's lifetime; revoking the key prevents future reveals, not values already delivered. Avoid wrapping the resolver in Varlock's `cache()` if immediate revocation and rotation checks are required.

| Status | Meaning |
| --- | --- |
| 401 | Invalid, expired, revoked, or inaccessible key |
| 403 | Item and its folder not granted to this key, deleted, wrong profile, or current Vault permission denied |
| 409 | Item changed or access was removed during reveal |
| 429 | Rate limit reached. Each key may make twice as many reveals per minute as the secrets it can currently reveal, at least 200 and at most 2,000, per server process |
| 503 | Reveal or required audit unavailable |

HTTP error bodies and network exception details are never included in plugin diagnostics. Ordinary MCP and OAuth flows still do not expose secret plaintext.

## Development

```sh
npm ci --prefix packages/varlock-strap-plugin
npm --prefix packages/varlock-strap-plugin run typecheck
npm --prefix packages/varlock-strap-plugin test
npm pack ./packages/varlock-strap-plugin --dry-run
```

Tests cover transport restrictions, safe diagnostics, fresh retrieval, and actual Varlock CLI loading, sensitivity, multiple instances, and child-process injection. The build uses esbuild only as a development dependency to produce a portable CommonJS bundle, matching Varlock's official plugin loader.

See the official [plugin guide](https://varlock.dev/guides/plugins/) for schema loading and [source](https://github.com/dmno-dev/varlock/tree/main/packages/plugins) for the plugin API.
