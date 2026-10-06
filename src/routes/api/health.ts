import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/health/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: { handlers: routeHandlers(handlers) },
});
