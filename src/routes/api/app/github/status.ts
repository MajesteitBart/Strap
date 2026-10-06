import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/github/status/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/github/status")({
  server: { handlers: routeHandlers(handlers) },
});
