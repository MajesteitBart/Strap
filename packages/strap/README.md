# Strap CLI

The first-party terminal client for [Strap](https://strap.bvdm.ai). Strap bootstraps your agents with context, skills, and keys through the same OAuth-protected MCP server used by Claude, Codex, ChatGPT, Cursor, and other integrations.

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
strap call read_strap
strap call strap_search --query "current priorities" --limit 5
strap resources
strap resource strap://profile
strap prompts
strap prompt introduce-me
```

`read_creed`, the `creed_*` tool names, and `creed://profile` are stable MCP compatibility identifiers. The product and CLI are Strap.

Run `strap` with no arguments for an interactive terminal that discovers the live tool schema and prompts for required fields.

Every MCP tool is also available directly by its exact name:

```bash
strap strap_get_section --section-id goals
```

For scripts and coding agents, use JSON mode:

```bash
strap --agent codex tools --json
strap --agent codex call strap_search --args '{"query":"pricing","limit":5}' --json
printf '%s' '{"sectionId":"goals"}' | strap --agent codex call strap_get_section --json
```

JSON is written to stdout and diagnostics are written to stderr. Interactive formatting and ANSI color are disabled outside a terminal. Commands copied from `strap.bvdm.ai/connections` include `--agent` so the dashboard can attribute CLI use. Omit it for unattributed manual use.

## Shared skills

The CLI uses the profile selected during login. To switch from Personal to Company (or another Company), run `strap logout`, then `strap login` and select that profile. Use a separate sync directory for each profile.

Version 0.2.0 adds device sync for the skill library in your connected Personal or Company profile:

```bash
# Publish an existing skill folder from your first device
strap skills push ./review-code

# On each device, install shared skills for Codex or Claude Code
strap skills sync --target codex --global
strap skills sync --target claude --global

# Use project-local skills, another directory, or download only
strap skills pull --target codex
strap skills sync --dir ./team-skills --dry-run
strap skills pull review-code --dir ./team-skills
strap skills list --json
```

A skill folder contains `SKILL.md` with YAML `name` and `description`, plus optional scripts, references, and assets. Names use lowercase letters, numbers, and single hyphens and must match the folder. The app can import a folder, edit its text files, download a JSON bundle, archive a skill, and restore retained versions. Limits are 100 skills per profile, 128 files per skill, 512 KiB per file, and 2 MiB per bundle. YAML aliases, hidden paths, credentials, dependencies, linked files, and Windows-reserved paths are rejected. Optional scripts are copied, never executed.

Each profile retains up to 20 versions per skill within a 64 MiB budget for current bundles and saved versions, measured as encoded stored data. The oldest historical copies are removed first; current skills remain intact. Publication fails without changing data if the current skills alone cannot fit. Reduce the files in an existing skill to free space. Browser folder imports cannot read executable permissions, so the editor requires you to review script flags before publishing. CLI publication and JSON bundle imports preserve executable metadata.

`pull` installs published versions. `sync` also publishes edits to previously managed skills when the remote copy has not changed. New local folders are published explicitly with `push`. Divergent changes or an unmanaged folder with different content stop the selected batch before changes. Compare both copies; then publish the reviewed local version with `strap skills push ./review-code --base-revision N`, using the current remote revision, or move your local folder aside before pulling. There is no implicit force overwrite or merge.

The `.strap-skills.json` ledger binds a directory to one server and profile. Use separate directories for Personal and Company libraries. A `.strap-skills.lock` prevents concurrent CLI syncs. Replaced or archived installations are preserved under a sibling `.<directory-name>-strap-backups` directory, outside the agent's skills root. Local edits block archive propagation. Restore the published skill in the app and sync again to reinstall it. A failed operation can leave a recoverable backup or staging directory; paths are printed when intervention is needed. Earlier completed operations may remain if a network or disk failure interrupts a batch.

Company members can read and install shared skills. Publishing requires a profile owner or Company admin and a direct MCP credential. Read-only and proposal-only connections cannot publish. Online agents use `strap_list_skills` to discover metadata, `strap_get_skill` for instructions or one supporting file, and `strap_export_skill` for a full bundle. Skills are user-provided guidance and cannot override agent instructions or grant access to Vault secrets.

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
- `4`: skill sync conflicts; the selected batch was not applied

Set `NO_COLOR=1` to disable terminal color.
