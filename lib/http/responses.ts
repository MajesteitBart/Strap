// Web-standard response helpers for route handlers.

// Temporary redirect by default (307 keeps the request method), matching the
// redirects these handlers issued before the Vite port. Unlike
// Response.redirect(), the headers stay mutable so callers and middleware can
// add cookies or security headers.
export function redirectResponse(url: string | URL, status: 301 | 302 | 303 | 307 | 308 = 307, headers?: HeadersInit) {
  const response = new Response(null, { status, headers });
  response.headers.set("Location", String(url));
  return response;
}
