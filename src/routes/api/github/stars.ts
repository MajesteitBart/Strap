import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/github/stars/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/stars")({
  server: { handlers: routeHandlers(handlers) },
});
