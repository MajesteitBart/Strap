import assert from "node:assert/strict";
import test from "node:test";
import { expiredCookie, readCookie, serializeCookie } from "../lib/http/cookies.ts";
import {
  DYNAMIC_HTML_CACHE_CONTROL,
  isImmutablePath,
  isNoStorePath,
  netlifyHeadersFile,
  permanentRedirectFor,
  securityHeaders,
} from "../lib/http/headers.ts";
import { memoize } from "../lib/http/memo.ts";
import { isPrerenderPath } from "../lib/http/prerender-paths.ts";
import { redirectResponse } from "../lib/http/responses.ts";
import { allowedMethods, routeHandlers } from "../lib/http/route-handlers.ts";
import { parseSearch, stringifySearch } from "../lib/http/search-params.ts";

const request = (method: string) => new Request("http://localhost/api/example", { method });

test("route handlers keep 405 and automatic OPTIONS semantics", async () => {
  const seen: Array<{ method: string; params: unknown }> = [];
  const handlers = routeHandlers({
    GET: async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
      seen.push({ method: req.method, params: await params });
      return Response.json({ ok: true });
    },
    POST: async () => new Response(null, { status: 201 }),
  });

  const ok = await handlers.GET!({ request: request("GET"), params: { id: "abc" } });
  assert.equal(ok.status, 200);
  assert.deepEqual(seen, [{ method: "GET", params: { id: "abc" } }]);

  const options = await handlers.OPTIONS!({ request: request("OPTIONS"), params: {} });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Allow"), "GET, HEAD, OPTIONS, POST");

  // Unsupported methods (MCP clients probe GET for an SSE stream) answer 405 with no body.
  const rejected = await handlers.ANY!({ request: request("DELETE"), params: {} });
  assert.equal(rejected.status, 405);
  assert.equal(await rejected.text(), "");
  assert.equal(handlers.DELETE, undefined);
  assert.equal(handlers.HEAD, undefined, "HEAD falls back to GET in the router");
});

test("an explicit OPTIONS handler is kept as written", async () => {
  const handlers = routeHandlers({
    OPTIONS: () => new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } }),
    POST: () => new Response(null),
  });
  const response = await handlers.OPTIONS!({ request: request("OPTIONS"), params: {} });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(allowedMethods({ POST: () => new Response(null) }), ["OPTIONS", "POST"]);
});

test("redirect responses default to 307 and stay mutable", () => {
  const response = redirectResponse(new URL("/login", "http://localhost"));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("Location"), "http://localhost/login");
  response.headers.append("Set-Cookie", "a=b");
  assert.equal(redirectResponse("/device", 303).status, 303);
});

test("signed-in pages are private and never stored", () => {
  for (const path of ["/", "/file", "/settings", "/settings/anything", "/account", "/vault", "/skills", "/connections", "/onboarding", "/onboarding/company", "/device", "/payment/success"]) {
    assert.equal(isNoStorePath(path), true, path);
  }
  for (const path of ["/home", "/pricing", "/filesystem", "/learn/strap-vs-mem0", "/api/app/state"]) {
    assert.equal(isNoStorePath(path), false, path);
  }
  assert.equal(isImmutablePath("/assets/index-abc123.js"), true);
  assert.equal(isImmutablePath("/api/og"), false);
  assert.match(DYNAMIC_HTML_CACHE_CONTROL, /no-store/);
});

test("security headers switch CSP to enforcing only when asked", () => {
  const reportOnly = Object.fromEntries(securityHeaders({ isDev: false, enforceCsp: false }));
  assert.equal(reportOnly["X-Frame-Options"], "SAMEORIGIN");
  assert.ok(reportOnly["Content-Security-Policy-Report-Only"]);
  assert.equal(reportOnly["Content-Security-Policy"], undefined);
  assert.doesNotMatch(reportOnly["Content-Security-Policy-Report-Only"], /unsafe-eval/);

  const enforced = Object.fromEntries(securityHeaders({ isDev: false, enforceCsp: true }));
  assert.match(enforced["Content-Security-Policy"], /upgrade-insecure-requests/);
});

test("static header rules cover every file Netlify serves directly", () => {
  const file = netlifyHeadersFile({ isDev: false, enforceCsp: false });
  assert.match(file, /^\/\*\n {2}X-Content-Type-Options: nosniff/);
  assert.match(file, /\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  assert.match(file, /\/file\n {2}Cache-Control: private, no-store/);
  assert.match(file, /\/llms\.txt\n {2}Cache-Control: public, max-age=3600, s-maxage=86400/);
});

test("retired URLs redirect permanently and protocol endpoints never do", () => {
  assert.equal(permanentRedirectFor("/context"), "/learn/what-is-a-personal-context-file");
  assert.equal(permanentRedirectFor("/context/"), "/learn/what-is-a-personal-context-file");
  assert.equal(permanentRedirectFor("/learn/creed-vs-mem0"), "/learn/strap-vs-mem0");
  for (const path of ["/", "/mcp", "/token", "/learn/strap-vs-mem0"]) assert.equal(permanentRedirectFor(path), null, path);
});

test("only content without per-request decisions is prerendered", () => {
  for (const path of ["/home", "/pricing", "/learn", "/learn/strap-vs-mem0", "/file", "/settings", "/onboarding", "/sitemap.xml", "/robots.txt"]) {
    assert.equal(isPrerenderPath(path), true, path);
  }
  for (const path of ["/", "/login", "/signup", "/authorize", "/device", "/invite/abc", "/roadmap", "/learn/", "/learn/creed-vs-mem0", "/api/health", "/mcp"]) {
    assert.equal(isPrerenderPath(path), false, path);
  }
});

test("cookies round-trip and expire", () => {
  const value = JSON.stringify({ mode: "company", nonce: "a;b" });
  const header = serializeCookie("state", value, { httpOnly: true, sameSite: "lax", maxAge: 600 });
  assert.match(header, /; Path=\/; Max-Age=600; HttpOnly; SameSite=Lax$/);
  const pair = header.split(";")[0];
  const incoming = new Request("http://localhost/", { headers: { cookie: `other=1; ${pair}` } });
  assert.equal(readCookie(incoming, "state"), value);
  assert.equal(readCookie(incoming, "missing"), undefined);
  assert.match(expiredCookie("state"), /^state=; Path=\/; Max-Age=0; Expires=Thu, 01 Jan 1970/);
});

test("query strings stay plain and readable", () => {
  assert.deepEqual(parseSearch("?next=/settings&tab=keys"), { next: "/settings", tab: "keys" });
  assert.equal(stringifySearch({ next: "/authorize?client_id=x&state=y" }), "?next=/authorize%3Fclient_id%3Dx%26state%3Dy");
  assert.equal(stringifySearch({ a: "1", skip: undefined }), "?a=1");
  assert.equal(stringifySearch({}), "");
  const original = { next: "/invite/a b+c", mode: "company" };
  assert.deepEqual(parseSearch(stringifySearch(original)), original);
});

test("memoized results are reused until they expire and failures are retried", async () => {
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await memoize("test:value", 60_000, load), 1);
  assert.equal(await memoize("test:value", 60_000, load), 1);
  let failures = 0;
  const failing = async () => {
    failures++;
    throw new Error("upstream down");
  };
  await assert.rejects(memoize("test:failing", 60_000, failing));
  await assert.rejects(memoize("test:failing", 60_000, failing));
  assert.equal(failures, 2);
});
