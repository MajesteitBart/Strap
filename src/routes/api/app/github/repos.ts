import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/github/repos/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/github/repos")({
  server: { handlers: routeHandlers(handlers) },
});
