import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/github/branches/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/github/branches")({
  server: { handlers: routeHandlers(handlers) },
});
