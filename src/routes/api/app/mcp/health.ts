import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/mcp/health/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/mcp/health")({
  server: { handlers: routeHandlers(handlers) },
});
