import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/state/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/state")({
  server: { handlers: routeHandlers(handlers) },
});
