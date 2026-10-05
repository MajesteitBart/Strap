import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/strap/write/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/strap/write")({
  server: { handlers: routeHandlers(handlers) },
});
