import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/creed/proposals/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/creed/proposals")({
  server: { handlers: routeHandlers(handlers) },
});
