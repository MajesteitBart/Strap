import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/claim/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/claim")({
  server: { handlers: routeHandlers(handlers) },
});
