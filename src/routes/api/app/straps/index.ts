import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/straps/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/straps/")({
  server: { handlers: routeHandlers(handlers) },
});
