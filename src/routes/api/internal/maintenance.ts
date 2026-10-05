import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/internal/maintenance/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/maintenance")({
  server: { handlers: routeHandlers(handlers) },
});
