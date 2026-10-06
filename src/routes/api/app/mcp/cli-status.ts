import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/mcp/cli-status/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/mcp/cli-status")({
  server: { handlers: routeHandlers(handlers) },
});
