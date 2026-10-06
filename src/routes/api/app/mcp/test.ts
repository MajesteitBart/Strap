import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/mcp/test/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/mcp/test")({
  server: { handlers: routeHandlers(handlers) },
});
