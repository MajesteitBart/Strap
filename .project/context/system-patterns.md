# System Patterns

Capture architecture and delivery patterns that should be reused.

## Handbook-First Delivery
- Use Delano for measurable outcomes, bounded projects, dependency-safe tasks, lifecycle transitions, and evidence-backed closeout. Apply the lighter first-turn workflow for narrow fixes.

## File-Contract-First State
- `.project/projects/` is delivery truth; source code and migrations are executable truth. Use Delano CLI lifecycle commands for frontmatter and rollups, and keep context synchronized with confirmed implementation.

## Thin Runtime Wrapping
- Delano hooks and viewers may surface state but do not own it. Repository commands remain the authoritative build, test, typecheck, lint, migration, and application workflows.

## Compatibility Without Dual Truth
- `.agents/` is canonical. `.claude/` may link to its skills, and `CLAUDE.md` imports `AGENTS.md`; never author parallel instruction or runtime copies.

## Conservative Installation
- Initial installation is conflict-safe. Later refreshes exclude repository-owned `.project` state unless replacement is explicit.
- Do not run a new-project initializer such as next-forge over the established Strap application.

## Strap-First Compatibility
- Customer-visible branding, new setup, canonical origin, and default profile filename use Strap, `https://strap.bvdm.ai`, and `strap.md`.
- Canonical implementation paths use Strap naming. Narrow Creed-named re-export shims plus stable schema, event, storage, API aliases, MCP compatibility tools/resources, credential fallbacks, persisted rich-text CSS tokens, and the legacy origin remain only where compatibility or history requires them.
- Existing GitHub paths are authoritative. Read fallback may adopt `creed.md`, but push must never create a competing `strap.md` automatically.
- New CLI behavior lives in `packages/strap/`; `packages/creed-cli/` is not renamed or used as the implementation source.
- External tracker writes, deployments, and public GitHub actions require explicit approval.

## Explicit Agent Credential Grants
- MCP credential resolution normalizes OAuth and `creed_key_` API keys into an explicit Creed grant plus a maximum access mode.
- Only schema-marked legacy OAuth tokens without grant rows may fall back to Personal. Explicit grants that become inaccessible resolve to an empty, write-less state.
- Enforce credential modes at the mutation boundary by clamping section permissions and stripping write/direct tokens before tool dispatch.

## Vault Plaintext Boundary
- Store application-owned secret metadata in `public.creed_vault_items`; plaintext belongs only to Supabase Vault.
- Vault RPCs are service-role-only `SECURITY DEFINER` functions with an empty search path, fully qualified objects, and explicit execute revokes.
- List responses and audits contain metadata only. Explicit reveal uses `no-store` and fails closed when its required audit row cannot be persisted.
