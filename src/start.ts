import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { withBackgroundScope } from "@/lib/http/background";
import {
  DYNAMIC_HTML_CACHE_CONTROL,
  headerPolicyFromEnv,
  IMMUTABLE_CACHE_CONTROL,
  isImmutablePath,
  isNoStorePath,
  isPrivateEndpoint,
  NO_STORE_CACHE_CONTROL,
  permanentRedirectFor,
  securityHeaders,
} from "@/lib/http/headers";
import { redirectResponse } from "@/lib/http/responses";

type PlatformContext = { waitUntil?: (promise: Promise<unknown>) => void };

function requestIdFor(request: Request) {
  const incoming = request.headers.get("x-request-id");
  return incoming && incoming.length <= 80 ? incoming : crypto.randomUUID();
}

function applyResponsePolicy(response: Response, pathname: string, requestId: string, serverFunction: boolean) {
  for (const [name, value] of securityHeaders(headerPolicyFromEnv())) response.headers.set(name, value);
  response.headers.set("x-request-id", requestId);
  if (isImmutablePath(pathname)) {
    response.headers.set("Cache-Control", IMMUTABLE_CACHE_CONTROL);
  } else if (isNoStorePath(pathname)) {
    response.headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);
  } else if (!response.headers.has("Cache-Control") && response.headers.get("Content-Type")?.startsWith("text/html")) {
    response.headers.set("Cache-Control", DYNAMIC_HTML_CACHE_CONTROL);
  } else if ((serverFunction || isPrivateEndpoint(pathname)) && !response.headers.has("Cache-Control")) {
    // Server functions and API, MCP and OAuth endpoints return a user's data
    // or tokens. Next.js marked these dynamic responses no-store by default.
    response.headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);
  }
}

// Runs for every request the server handles: page renders, server routes and
// server functions. Static files on Netlify get the same headers from the
// generated _headers file (see scripts/vite-deploy-plugins.ts).
const requestPolicy = createMiddleware().server(async ({ request, pathname, context, handlerType, next }) => {
  const serverFunction = handlerType === "serverFn";
  const requestId = requestIdFor(request);
  try {
    // Route handlers log this id (lib/observability.ts) so log lines correlate.
    request.headers.set("x-request-id", requestId);
  } catch {
    // Some runtimes freeze incoming request headers; the response still carries the id.
  }

  const redirectTo = permanentRedirectFor(pathname);
  if (redirectTo) {
    const response = redirectResponse(`${redirectTo}${new URL(request.url).search}`, 308);
    applyResponsePolicy(response, pathname, requestId, serverFunction);
    return response;
  }

  const { waitUntil } = (context ?? {}) as PlatformContext;
  const result = await withBackgroundScope(waitUntil, () => next());
  let response = result.response;
  try {
    applyResponsePolicy(response, pathname, requestId, serverFunction);
  } catch {
    // fetch() and Response.redirect() responses have immutable headers. The
    // copy shares the body stream, so Start keeps ownership of it.
    response = new Response(response.body, response);
    applyResponsePolicy(response, pathname, requestId, serverFunction);
  }
  return response;
});

// Server functions are same-origin RPC endpoints used only by this app.
const serverFunctionCsrf = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [requestPolicy, serverFunctionCsrf],
}));
