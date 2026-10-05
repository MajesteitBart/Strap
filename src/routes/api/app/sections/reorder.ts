import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/sections/reorder/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/sections/reorder")({
  server: { handlers: routeHandlers(handlers) },
});
