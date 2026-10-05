import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/feedback/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/feedback")({
  server: { handlers: routeHandlers(handlers) },
});
