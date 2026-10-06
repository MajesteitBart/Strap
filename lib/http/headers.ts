// Response header and redirect policy shared by the server middleware
// (src/start.ts), the generated Netlify _headers file for static files, and
// the local production server (scripts/serve.mjs). Netlify never applies
// _headers to function responses, so both paths must read the same rules.

export type HeaderPolicyOptions = { isDev: boolean; enforceCsp: boolean };

export function headerPolicyFromEnv(env: Record<string, string | undefined> = process.env): HeaderPolicyOptions {
  return {
    isDev: env.NODE_ENV !== "production",
    enforceCsp: (env.STRAP_CSP_ENFORCE ?? env.CREED_CSP_ENFORCE) === "1",
  };
}

// CSP: blocks framing and restricts script origins. Inline styles are allowed
// because Tailwind v4 and Motion both set them, and inline scripts are allowed
// for the theme bootstrap and router hydration data. To tighten further, move
// to nonce-based scripts in the request middleware.
export function contentSecurityPolicy({ isDev, enforceCsp }: HeaderPolicyOptions) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.github.com",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(enforceCsp ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// Applied to every response. CSP runs in Report-Only until STRAP_CSP_ENFORCE=1
// so violations can be watched for a release cycle before enforcing.
export function securityHeaders(options: HeaderPolicyOptions): Array<[string, string]> {
  return [
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "SAMEORIGIN"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
    ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
    [options.enforceCsp ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", contentSecurityPolicy(options)],
  ];
}

// Routes whose HTML belongs to the signed-in user. They are pinned to
// `private, no-store` so a CDN or the browser back-forward cache never shows
// one user the previous user's page after sign-out or an account switch on a
// shared device. Each entry also covers its sub-paths.
export const NO_STORE_PATHS = [
  "/",
  "/file",
  "/onboarding",
  "/connections",
  "/device",
  "/vault",
  "/skills",
  "/settings",
  "/account",
  "/payment/success",
] as const;

export const NO_STORE_CACHE_CONTROL = "private, no-store";

// Server-rendered HTML without its own caching policy is never stored.
export const DYNAMIC_HTML_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

// Brand assets are versioned by filename and build output is content-hashed;
// both live under /assets and are cached hard.
export const IMMUTABLE_PREFIXES = ["/assets/"] as const;

export function isNoStorePath(pathname: string) {
  return NO_STORE_PATHS.some((path) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`),
  );
}

// Endpoints that answer with a user's data, tokens or OAuth grants. A response
// without its own Cache-Control is never stored; handlers that serve public
// data (health, version, OG images, avatars) set their own policy.
export const PRIVATE_ENDPOINT_PREFIXES = [
  "/api",
  "/mcp",
  "/token",
  "/register",
  "/revoke",
  "/authorize",
  "/device",
  "/auth",
] as const;

export function isPrivateEndpoint(pathname: string) {
  // The router matches paths case-insensitively, so /API/app/state reaches the
  // same handler and must get the same policy.
  const path = pathname.toLowerCase();
  return PRIVATE_ENDPOINT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isImmutablePath(pathname: string) {
  return IMMUTABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Permanent redirects for retired URLs. The /context explainer was folded into
// the learn library, and the Creed-era guide slugs keep their search equity.
export const PERMANENT_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ["/context", "/learn/what-is-a-personal-context-file"],
  ["/learn/creed-vs-chatgpt-memory", "/learn/strap-vs-chatgpt-memory"],
  ["/learn/creed-vs-claude-memory", "/learn/strap-vs-claude-memory"],
  ["/learn/creed-vs-mem0", "/learn/strap-vs-mem0"],
  ["/learn/connect-creed-to-chatgpt", "/learn/connect-strap-to-chatgpt"],
  ["/learn/connect-creed-to-claude-code", "/learn/connect-strap-to-claude-code"],
  ["/learn/connect-creed-to-cursor", "/learn/connect-strap-to-cursor"],
];

export function permanentRedirectFor(pathname: string) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PERMANENT_REDIRECTS.find(([source]) => source === normalized)?.[1] ?? null;
}

// Prerendered crawler files keep the caching their route handlers declare.
export const STATIC_FILE_CACHE_CONTROL: ReadonlyArray<readonly [string, string]> = [
  ["/llms.txt", "public, max-age=3600, s-maxage=86400"],
  ["/llms-full.txt", "public, max-age=3600, s-maxage=86400"],
  ["/adf79f0bf26d7d95d49893645669789c.txt", "public, max-age=86400"],
];

// Netlify serves prerendered pages and build assets straight from its CDN, so
// their headers come from this file instead of the request middleware.
export function netlifyHeadersFile(options: HeaderPolicyOptions) {
  const block = (path: string, headers: Array<[string, string]>) =>
    [path, ...headers.map(([name, value]) => `  ${name}: ${value}`)].join("\n");
  const cacheRules = [
    ...IMMUTABLE_PREFIXES.map((prefix) => block(`${prefix}*`, [["Cache-Control", IMMUTABLE_CACHE_CONTROL]])),
    ...NO_STORE_PATHS.flatMap((path) =>
      path === "/"
        ? [block("/", [["Cache-Control", NO_STORE_CACHE_CONTROL]])]
        : [path, `${path}/*`].map((pattern) => block(pattern, [["Cache-Control", NO_STORE_CACHE_CONTROL]])),
    ),
    ...STATIC_FILE_CACHE_CONTROL.map(([path, value]) => block(path, [["Cache-Control", value]])),
  ];
  return [block("/*", securityHeaders(options)), ...cacheRules].join("\n\n") + "\n";
}
