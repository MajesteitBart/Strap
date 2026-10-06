import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/mcp/revoke/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/mcp/revoke")({
  server: { handlers: routeHandlers(handlers) },
});
