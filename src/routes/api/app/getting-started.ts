import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/getting-started/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/getting-started")({
  server: { handlers: routeHandlers(handlers) },
});
