// Sanitize a `next` redirect target from a query param. Only same-origin
// relative paths are allowed - rejects absolute URLs and protocol-relative /
// backslash tricks (`//evil.com`, `/\evil.com`) that could redirect off-site.
// Browsers drop tabs and newlines inside URLs, so `/\t/evil.com` would become
// `//evil.com`; control characters are rejected and the parsed origin checked.
const PROBE_ORIGIN = "http://next.invalid";

export function sanitizeNextPath(next: string | string[] | undefined | null): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return "/";
  }
  try {
    if (new URL(value, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return "/";
  } catch {
    return "/";
  }
  return value;
}
