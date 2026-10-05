import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/headless-access/[id]/rotate/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/headless-access/$id/rotate")({
  server: { handlers: routeHandlers(handlers) },
});
