import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/og/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/og")({
  server: { handlers: routeHandlers(handlers) },
});
