import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/proposals/[id]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/proposals/$id")({
  server: { handlers: routeHandlers(handlers) },
});
