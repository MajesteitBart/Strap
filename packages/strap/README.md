# Strap CLI

The first-party terminal client for [Strap](https://strap.bvdm.ai). Strap bootstraps agents with context, skills, and secrets through the same OAuth-protected MCP server used by Claude, Codex, ChatGPT, Cursor, and other integrations.

The CLI discovers tools, resources, and prompts from the live server, so new capabilities appear without a matching CLI release.

## Install

```bash
npm install --global @bvdm/strap
strap
```

You can also run Strap without installing it:

```bash
npx @bvdm/strap
```

The first run opens Strap's OAuth screen in your browser. Approve the connection, then return to the terminal.

## Commands

```bash
strap login
strap logout
strap status
strap doctor
strap tools
strap call read_creed
strap call creed_search --query "current priorities" --limit 5
strap resources
strap resource creed://profile
strap prompts
strap prompt introduce-me
```

`read_creed`, the `creed_*` tool names, and `creed://profile` are stable MCP compatibility identifiers. The product and CLI are Strap.

Run `strap` with no arguments for an interactive terminal that discovers the live tool schema and prompts for required fields.

Every MCP tool is also available directly by its exact name:

```bash
strap creed_get_section --section-id goals
```

For scripts and coding agents, use JSON mode:

```bash
strap --agent codex tools --json
strap --agent codex call creed_search --args '{"query":"pricing","limit":5}' --json
printf '%s' '{"sectionId":"goals"}' | strap --agent codex call creed_get_section --json
```

JSON is written to stdout and diagnostics are written to stderr. Interactive formatting and ANSI color are disabled outside a terminal. Commands copied from `strap.bvdm.ai/connections` include `--agent` so the dashboard can attribute CLI use. Omit it for unattributed manual use.

## Self-hosted servers

Use a server for one command:

```bash
strap --server http://localhost:3000/mcp doctor
```

Or save it:

```bash
strap config set server https://your-strap.example/mcp
```

`STRAP_MCP_URL` can also set the server. HTTPS is required except on localhost. `STRAP_CONFIG_DIR` overrides the platform configuration directory.

Strap keeps its configuration and credentials separate from `creed-cli`. It does not read or migrate legacy CLI credentials automatically.

## Security and exit codes

Strap CLI uses OAuth 2.1 Dynamic Client Registration and PKCE. It never asks you to copy an API token. Credentials are stored per server in the platform configuration directory with restrictive filesystem permissions and are never printed. `strap logout` attempts RFC 7009 revocation before removing local credentials.

- `0`: command completed successfully
- `1`: runtime, network, or authorization failure
- `2`: invalid command or arguments
- `3`: the MCP tool returned an error result

Set `NO_COLOR=1` to disable terminal color.
