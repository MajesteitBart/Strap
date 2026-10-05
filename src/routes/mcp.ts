import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/mcp/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/mcp")({
  server: { handlers: routeHandlers(handlers) },
});
