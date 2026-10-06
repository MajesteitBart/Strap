// Binds a framework-neutral handler module to a TanStack Start server route.
//
// Handler modules under server/ export one function per HTTP method with the
// signature `(request, { params })`, where `params` is a promise. Tests call
// those functions directly, so they stay free of router imports. This adapter
// also keeps the method semantics clients relied on before the Vite port:
// an unsupported method answers 405 with an empty body (MCP clients treat a
// 405 on GET as "no SSE stream"), and OPTIONS without an explicit handler
// answers 204 with an Allow header.

export const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

type Params = Record<string, string>;
export type RouteHandler<P extends Params = Params> = (
  request: Request,
  context: { params: Promise<P> },
) => Response | Promise<Response>;
export type HandlerModule<P extends Params = Params> = Partial<Record<HttpMethod, RouteHandler<P>>>;

type ServerRouteContext = { request: Request; params: Params };
type ServerRouteHandler = (context: ServerRouteContext) => Response | Promise<Response>;

export function allowedMethods<P extends Params>(module: HandlerModule<P>) {
  const methods = new Set<string>();
  for (const method of HTTP_METHODS) if (module[method]) methods.add(method);
  if (methods.has("GET")) methods.add("HEAD");
  methods.add("OPTIONS");
  return [...methods].sort();
}

// `P` is the module's own params shape; the route's URL pattern supplies
// exactly those keys.
export function routeHandlers<P extends Params>(module: HandlerModule<P>) {
  const handlers: Partial<Record<HttpMethod | "ANY", ServerRouteHandler>> = {};
  for (const method of HTTP_METHODS) {
    const handler = module[method];
    if (!handler) continue;
    handlers[method] = ({ request, params }) => handler(request, { params: Promise.resolve({ ...params } as P) });
  }
  if (!handlers.OPTIONS) {
    const allow = allowedMethods(module).join(", ");
    handlers.OPTIONS = () => new Response(null, { status: 204, headers: { Allow: allow } });
  }
  handlers.ANY = () => new Response(null, { status: 405 });
  return handlers;
}
