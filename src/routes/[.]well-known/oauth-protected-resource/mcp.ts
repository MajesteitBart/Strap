import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/.well-known/oauth-protected-resource/mcp/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-protected-resource/mcp")({
  server: { handlers: routeHandlers(handlers) },
});
