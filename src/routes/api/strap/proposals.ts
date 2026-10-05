import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/strap/proposals/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/strap/proposals")({
  server: { handlers: routeHandlers(handlers) },
});
