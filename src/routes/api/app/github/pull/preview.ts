import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/github/pull/preview/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/github/pull/preview")({
  server: { handlers: routeHandlers(handlers) },
});
