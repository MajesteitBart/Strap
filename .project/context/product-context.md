# Product Context

## Users
- Personal users curate one profile for all connected agents and approve or permit agent-authored changes by section.
- Company owners, admins, editors, and members collaborate under role, section, membership, billing, and frozen-state rules.
- Repository maintainers and coding agents need compact, current delivery truth without personal information or credentials entering source.

## Core Flows
- Onboarding produces the first compact Creed; the editor and quality analysis help keep it useful.
- Agents connect through OAuth/MCP or bearer-token APIs, read only allowed sections, and propose or directly apply updates according to permission.
- Users review proposals, inspect activity and health, configure connections, billing, integrations, and optional Company behavior.
- GitHub synchronization preserves lossless Markdown round trips; the first-party CLI discovers the live MCP surface.

## Constraints
- Creed is not a notes app, journal, chat-memory store, or generic AI wrapper.
- Marketing routes never load user state.
- Browser APIs require a Supabase session; agent APIs require hashed token or OAuth authentication.
- Hidden sections and secrets never leave the server. Company access never exceeds the user's effective permissions.
- Personal and Company persistence paths remain distinct. Billing and frozen-state gates remain effective.
- Agent-contract changes affect every connected agent and require focused multi-model validation.
