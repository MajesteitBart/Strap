# Product Context

## Users
- Personal users curate one profile for all connected agents and approve or permit agent-authored changes by section.
- Company owners, admins, editors, and members collaborate under role, section, membership, billing, and frozen-state rules.
- Repository maintainers and coding agents need compact, current delivery truth without personal information or credentials entering source.

## Core Flows
- Onboarding produces the first compact Strap profile; the editor and quality analysis help keep it useful.
- Agents connect through OAuth/MCP or bearer-token APIs, read only allowed sections, and propose or directly apply updates according to permission.
- Users review proposals, inspect activity and health, configure connections, billing, integrations, and optional Company behavior.
- New GitHub synchronization defaults to `strap.md`; existing stored paths, including `creed.md`, remain authoritative and lossless. The first-party `@bvdm/strap` CLI discovers the live MCP surface.

## Constraints
- Strap is not a notes app, journal, chat-memory store, or generic AI wrapper.
- Marketing routes never load user state.
- Browser APIs require a Supabase session; agent APIs require hashed token or OAuth authentication.
- Hidden sections and secrets never leave the server. Company access never exceeds the user's effective permissions.
- Personal and Company persistence paths remain distinct. Billing and frozen-state gates remain effective.
- Agent-contract changes affect every connected agent and require focused multi-model validation.
- `https://strap.bvdm.ai` is canonical. `https://creed.md`, `/api/creed/**`, `creed_*` tools, credential prefixes, and other documented identifiers remain compatibility contracts until an approved migration removes them.
