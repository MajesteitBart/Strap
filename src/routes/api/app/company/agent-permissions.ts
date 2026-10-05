import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/company/agent-permissions/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/company/agent-permissions")({
  server: { handlers: routeHandlers(handlers) },
});
