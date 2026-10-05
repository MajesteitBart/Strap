// Pages rendered to static HTML at build time and served from the CDN.
//
// Marketing pages hold no user data. The signed-in app routes render on the
// client (`ssr: false`), so their prerendered HTML is only the document shell
// and loading state; the user's data arrives through a server function after
// the shell loads. Pages that decide on the server per request (sign-in
// redirects, OAuth consent, invites, the `/` redirect) are never prerendered.
export const PRERENDERED_MARKETING_PATHS = [
  "/home",
  "/pricing",
  "/docs",
  "/learn",
  "/privacy",
  "/terms",
  "/stack",
  "/changelog",
  "/examples",
  "/company",
  "/bench",
  "/reset-password",
] as const;

export const PRERENDERED_APP_SHELL_PATHS = [
  "/file",
  "/settings",
  "/connections",
  "/vault",
  "/skills",
  "/account",
  "/onboarding",
  "/onboarding/company",
] as const;

// Crawler and manifest files, generated once per deploy like the pages above.
export const PRERENDERED_FILE_PATHS = [
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/llms.txt",
  "/llms-full.txt",
  "/adf79f0bf26d7d95d49893645669789c.txt",
] as const;

export function isPrerenderPath(path: string) {
  const pathname = path.split(/[?#]/)[0];
  // Index routes are discovered as "/learn/"; only the canonical "/learn" is written.
  if (pathname !== "/" && pathname.endsWith("/")) return false;
  if ((PRERENDERED_MARKETING_PATHS as readonly string[]).includes(pathname)) return true;
  if ((PRERENDERED_APP_SHELL_PATHS as readonly string[]).includes(pathname)) return true;
  if ((PRERENDERED_FILE_PATHS as readonly string[]).includes(pathname)) return true;
  // Every guide in the learn library; crawled from the /learn index.
  return /^\/learn\/[a-z0-9-]+$/.test(pathname) && !pathname.startsWith("/learn/creed-") && !pathname.startsWith("/learn/connect-creed-");
}
