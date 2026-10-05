import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/creed/write/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/creed/write")({
  server: { handlers: routeHandlers(handlers) },
});
