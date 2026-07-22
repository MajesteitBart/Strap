---
name: creed-repo
description: Repository-specific guidance for understanding, reviewing, debugging, changing, testing, and operating the Creed codebase. Use for any task in the Creed repository involving its Next.js application, Personal or Company Creed domain model, editor and proposals, Supabase schema or RLS, OAuth/MCP and the CLI, OpenRouter AI and credits, Stripe billing, GitHub synchronization, security boundaries, routing, or verification.
---

# Creed repository

Work from the repository's current source while using the bundled OpenWiki snapshot for architecture, domain, security, integration, and testing context.

## Workflow

1. Locate the Creed repository root and read its `AGENTS.md` completely. Follow any more specific instruction files for the path being changed.
2. Read [references/quickstart.md](references/quickstart.md) for every task. It defines the product boundary, repository map, core invariants, and starting points.
3. Read the task-relevant references listed below before inspecting or editing the affected code path.
4. Read the complete local flow around the target code, including callers, persistence, authorization, and tests. Treat current source, migrations, and package scripts as canonical if a reference is stale.
5. Preserve Personal and Company behavior, human and agent permission paths, authentication boundaries, hidden-section filtering, and billing/frozen-state behavior wherever they intersect the change.
6. Keep changes scoped. Preserve unrelated working-tree edits and avoid new dependencies unless clearly justified.
7. Verify in proportion to the change. Use the commands and focused checks in [references/development/testing-and-change-guide.md](references/development/testing-and-change-guide.md). Run migration and CLI checks when those surfaces are touched.
8. Before finishing, decide whether the work revealed durable repository knowledge. Update the appropriate live source documentation and regenerate OpenWiki rather than hand-editing generated OpenWiki pages, unless the user explicitly asks otherwise.

## Reference routing

- Always read [references/quickstart.md](references/quickstart.md).
- For runtime boundaries, route placement, active Creed resolution, or Personal versus Company persistence, read [references/architecture/overview.md](references/architecture/overview.md).
- For sections, permissions, proposals, review, onboarding, collaboration, and synchronization, read [references/domain/creed-model.md](references/domain/creed-model.md).
- For OAuth, MCP, agent bearer APIs, token handling, connection behavior, or `creed-cli`, read [references/integrations/agents-and-oauth.md](references/integrations/agents-and-oauth.md).
- For Supabase usage, OpenRouter, AI credits, Stripe, GitHub sync, configuration, or deployment, read [references/integrations/platform-services.md](references/integrations/platform-services.md).
- For migrations, RLS, service-role access, authorization, credential storage, privacy, auditing, or retention, read [references/data/schema-and-security.md](references/data/schema-and-security.md).
- For implementation changes, tests, high-risk files, coverage gaps, or final verification, read [references/development/testing-and-change-guide.md](references/development/testing-and-change-guide.md).

Read every reference whose topic intersects the request. For cross-cutting work, read all references rather than relying on the quickstart alone.

## Guardrails

- Do not turn Creed into a notes app, journal, chat-memory store, or generic AI wrapper.
- Do not weaken browser, agent, OAuth, RLS, service-role, section-permission, or billing authorization boundaries.
- Do not expose hidden sections or secrets. Never print or commit `.env.local`, raw credentials, or tokens.
- Do not route Company writes through Personal full-state persistence.
- Treat changes to `lib/creed-data.ts` agent instructions and `app/mcp/route.ts` protocol behavior as ecosystem-wide changes requiring focused validation.
- Use `npx supabase` and load the intended checkout's `.env.local` without printing secrets before configured Supabase operations. Confirm the project reference before remote migration commands.
- Use repository logging utilities instead of `console.log`, keep strict TypeScript free of `any`, and default to server components unless client behavior is required.
