import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/strap/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/strap/")({
  server: { handlers: routeHandlers(handlers) },
});
