# Shared Strap skills

[`use-strap`](use-strap/SKILL.md) explains how agents connect to Strap, read Personal and Company context, install shared skills, resolve Vault secrets through Varlock, and keep content current. It is one portable `SKILL.md`, with no scripts, dependencies, credentials, or copied profile content. Detailed CLI and Varlock guidance stays in the existing package guides.

## Install

From this checkout:

```sh
npx skills add ./skills/use-strap --copy
```

Choose the agent and scope in the installer. Add `--global` for user-wide installation. You can also copy the `use-strap` folder into an agent's supported skills directory. The [skills installer](https://github.com/vercel-labs/skills#install-a-skill) supports local paths and GitHub sources; `--copy` avoids symlinks that Strap's sync rejects.

Once these files are published to `main`, install from GitHub:

```sh
npx skills add https://github.com/MajesteitBart/Strap/tree/main/skills/use-strap --copy
```

To make Strap the distribution source, first connect the CLI to the intended profile and inspect `strap call list_straps --args '{}' --json`. An owner/admin with a direct connection can publish this folder from the repository root:

```sh
strap skills push ./skills/use-strap --dry-run
strap skills push ./skills/use-strap
```

Then install it on another device with `strap skills pull use-strap --target codex --global` (or `--target claude`). The push binds this checkout's `skills/` directory to that profile. Use a separate staging directory to publish to another profile. Choose GitHub or Strap to maintain each installed copy; do not let two updaters manage the same folder. Installing the skill does not create an MCP connection or modify `AGENTS.md`; the skill explains those steps.

## Setup gaps and follow-up plan

These findings are based on the current source and npm CLI 0.2.0. This change documents supported behavior; the product work below remains planned.

| Gap | Current behavior and evidence | Follow-up |
| --- | --- | --- |
| No managed `AGENTS.md` across devices | [Profile paths](../lib/profile-file.ts) default to `strap.md`. The [CLI](../packages/strap/src/app.ts) has no context export/sync command. [Agent reads](../lib/strap-data.ts) explicitly frame profile sections as data. | Define a separate instruction-file contract before treating team content as executable guidance. Add an explicit export/install operation with profile selection, revision/freshness metadata, and an owned block or separate file that preserves existing local instructions. Define offline behavior. Until then, use the bootstrap in the skill. |
| Personal and Company need separate connections | [MCP](../app/mcp/route.ts) scopes a credential to one profile. [CLI credentials](../packages/strap/src/config/store.ts) store one login per server per config directory. [Sync ledgers](../packages/strap/src/skills/files.ts) bind each destination to one profile. | Add named CLI connections and an explicit way to select personal and team libraries. Keep grants separate; test name collisions and prevent personal context or skills from being published into a Company profile. Today, use separate config directories and global/project skill destinations. |
| CLI cannot bootstrap headless authentication | [CLI transport](../packages/strap/src/mcp/client.ts) uses browser OAuth and a local callback. The server supports device grants and API keys, but the CLI does not implement either login path. | Add device authorization and a secure API-key input mechanism with expiry/revocation tests. Until then, use browser CLI login or a compatible headless MCP client. The root README's broader CLI claim is corrected in this change. |
| Team secrets are limited to managers | The [provider guide](../packages/varlock-strap-plugin/README.md#set-up-strap) and [Vault authorization](../lib/api-key-vault.ts) require live Company owner/admin access as well as individual item grants. | Decide whether ordinary members need delegated runtime secrets. Any such feature needs an explicit item-level policy; do not solve it by sharing an admin's key. |
| Sync is manual and can publish | [Skill sync](../packages/strap/src/skills/sync.ts) can upload local edits. It has no watcher or scheduler, and linked directories are rejected. | Use `pull` for consuming centrally managed skills. If automatic refresh is added, make scheduling opt-in, retain conflict/backups behavior, and keep publication explicit. Verify target directories on Windows, macOS, and Linux. |

Implement the instruction-file contract first, then named connections and headless login. Decide member secret access separately because it changes authorization. Automatic pull can follow once profile and destination selection are clear.

The generated `openwiki/` pages still describe retired Supabase/OpenRouter behavior. Use current source and the package guides for this work; regenerate those pages through their normal workflow rather than copying them into the skill.
