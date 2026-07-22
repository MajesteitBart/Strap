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
- Do not run a new-project initializer such as next-forge over the established Creed application.
- External tracker writes, deployments, and public GitHub actions require explicit approval.
