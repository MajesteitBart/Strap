import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/.well-known/oauth-authorization-server/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
  server: { handlers: routeHandlers(handlers) },
});
