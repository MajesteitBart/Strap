# Security policy

## Reporting a vulnerability

Report suspected Strap vulnerabilities privately. Do not open a public GitHub issue.

Email the address configured by `NEXT_PUBLIC_CONTACT_EMAIL`, also shown in the live site footer and Privacy page, with:

- a concise description
- the smallest reproduction
- expected impact
- any intended disclosure timeline

## Scope

The highest-risk surfaces are:

- `/api/creed/**` and `/mcp`, which are stable agent-facing compatibility routes authenticated by OAuth or bearer credentials
- `/api/app/**`, which must enforce `requireApiAuth()`
- headless access keys and explicit Personal or Company grants
- encrypted provider tokens and `CREED_ENCRYPTION_SECRET`
- Supabase Vault secret boundaries and metadata-only audit behavior
- prompt injection through user- or agent-supplied content
- security headers and CSP in `next.config.ts`
- Supabase RLS policies in `supabase/migrations/**`

Access to another user's context or secrets, privilege escalation across Personal or Company boundaries, plaintext credential disclosure, and bypasses of approval or section permission are in scope.

Third-party service vulnerabilities in Supabase, OpenRouter, GitHub, Stripe, or Resend should be reported upstream unless Strap's integration creates the issue.

## Self-hosting hardening

1. Generate a fresh 32-byte base64 `CREED_ENCRYPTION_SECRET`. The name is retained as a compatibility identifier.
2. Use distinct Supabase server secrets per environment and never commit them.
3. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS origin used for OAuth discovery.
4. Set `CREED_CSP_ENFORCE=1` only after validating a report-only deployment cycle.
5. Apply every migration before accepting real users.
6. Keep `https://creed.md` serving MCP/OAuth directly if you operate the legacy compatibility origin; some MCP POST clients do not safely follow redirects.
7. Never log Vault plaintext, OAuth tokens, API keys, or secret-bearing profile exports.
