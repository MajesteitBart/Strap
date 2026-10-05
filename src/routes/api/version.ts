import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/version/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/version")({
  server: { handlers: routeHandlers(handlers) },
});
