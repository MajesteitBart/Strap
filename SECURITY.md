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
- Application-encrypted Vault secret boundaries and metadata-only audit behavior
- prompt injection through user- or agent-supplied content
- security headers, CSP and caching rules in `lib/http/headers.ts` (applied by `src/start.ts` and the generated Netlify `_headers` file)
- Explicit database guards in `lib/authz/**` and scoped repositories in `lib/db/**`

Access to another user's context or secrets, privilege escalation across Personal or Company boundaries, plaintext credential disclosure, and bypasses of approval or section permission are in scope.

Third-party service vulnerabilities in Better Auth, Postgres, GitHub, Stripe, or Resend should be reported upstream unless Strap's integration creates the issue.

## Security requirements

### SEC-MFA-001: Multi-factor authentication

Status: required. Authenticator-app TOTP with recovery codes is implemented and verified locally; production verification is pending.

Strap must support MFA for user accounts protecting personal context, Company resources and Vault secrets.

Acceptance criteria:

- Secure second-factor enrollment with proof before activation and visible MFA status in Account settings.
- Once enabled, no authenticated new sign-in before MFA completion. Alternate sign-in methods must not bypass it.
- Secure lost-factor recovery with protected, single-use recovery credentials.
- Disabling/replacing factors or regenerating recovery credentials requires recent authentication plus the current factor or an approved recovery flow.
- Rate-limit challenges and recovery; reject replayed/expired credentials; audit security events without secret values.
- Browser OAuth consent and device approval respect account MFA. Scoped agent credentials remain non-interactive with unchanged permission boundaries.
- Behavioral tests cover enrollment, challenges, recovery, factor management, replay and alternate-login bypasses.

Implementation decisions:

- Enrollment is optional per account. Nothing forces MFA on all users or on Company roles; that needs an owner decision.
- `lib/auth/mfa.ts` holds any new session for an MFA-enabled account, whether it comes from email and password, a Google/X callback, a Google ID token or an email verification link. The session is deleted and a 10-minute challenge is issued instead. Trusted devices are rejected, so every new sign-in needs the factor.
- Recovery codes are encrypted, shown once and consumed atomically. Accepted TOTP codes are claimed per user until their validity window closes, so a code works once.
- Turning MFA off and regenerating recovery codes need a live session younger than Better Auth's `freshAge` (1 day), the password when the account has one, and a current TOTP or recovery code. The password is checked before a recovery code is spent. The setup key is never shown after enrollment.
- Every two-factor endpoint re-reads the session from the database. A session revoked within the 60-second cookie cache cannot enroll, verify or manage a factor.
- Activating MFA revokes the account's other sessions. Turning it off keeps existing sessions, which were already MFA-verified. Existing agent keys and OAuth tokens are unaffected.
- Each sign-in challenge allows 5 attempts, and 10 consecutive sign-in failures lock the factor for 15 minutes. `/two-factor/*` is limited to 3 requests per 10 seconds per client. Step-up attempts from a signed-in session do not count toward the lockout; they rely on that rate limit plus the session and password checks.
- `mfa.*` audit events record outcomes only, never codes, secrets or tokens.

## Self-hosting hardening

1. Generate a fresh 32-byte base64 `CREED_ENCRYPTION_SECRET`. The name is retained as a compatibility identifier.
2. Use distinct database credentials, Better Auth, token-encryption, Vault and maintenance secrets per environment and never commit them.
3. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS origin used for OAuth discovery.
4. Set `CREED_CSP_ENFORCE=1` only after validating a report-only deployment cycle.
5. Apply every migration before accepting real users.
6. Keep `https://creed.md` serving MCP/OAuth directly if you operate the legacy compatibility origin; some MCP POST clients do not safely follow redirects.
7. Never log Vault plaintext, OAuth tokens, API keys, or secret-bearing profile exports.
