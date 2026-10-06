import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/welcome/seen/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/welcome/seen")({
  server: { handlers: routeHandlers(handlers) },
});
