import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/github/push/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/github/push")({
  server: { handlers: routeHandlers(handlers) },
});
