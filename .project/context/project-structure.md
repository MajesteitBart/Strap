# Project Structure

Document major repository boundaries and ownership.

## Canonical Boundaries
- `HANDBOOK.md`: installed Delano operating model; repository-specific rules in `AGENTS.md` take precedence where they are narrower.
- `.project/`: repository-owned delivery context, projects, templates, and registries. It is not application data.
- `.agents/`: canonical Delano runtime, validation scripts, rules, hooks, and repo-local skills, including `creed-repo`.
- `.claude/`: compatibility links only; `CLAUDE.md` points to `AGENTS.md`.
- `.delano/`: optional local viewer assets, never source of truth.

## Runtime Areas
- `app/`: public, authenticated, OAuth, API, and MCP routes.
- `components/`: product, marketing, auth, and shared UI.
- `lib/`: domain, persistence, authorization, integrations, AI, crypto, logging, and shared helpers.
- `supabase/migrations/`: forward-only canonical database schema and policies.
- `packages/strap/`: independently built and tested `@bvdm/strap` MCP terminal client.
- `packages/creed-cli/`: preserved legacy CLI compatibility package.
- `tests/`: Node tests for logic, migrations, and contracts.

## Documentation Areas
- `README.md`, `CONTRIBUTING.md`, and `SECURITY.md` are the primary public operator documents.
- `AGENTS.md` and `BOOTSTRAP.md` are agent operating and setup entrypoints.
- `openwiki/` is generated architecture documentation and must be regenerated rather than hand-edited.

## Working Notes
- `project-context/` may exist only in maintainer checkouts and is gitignored. When absent, use the fallback reading order in `AGENTS.md`.
- Preserve unrelated working-tree changes. Do not commit `.env.local`, raw tokens, local screenshots, or secret-bearing exports.
