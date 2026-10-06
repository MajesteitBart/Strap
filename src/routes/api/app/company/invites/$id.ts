import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/company/invites/[id]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/company/invites/$id")({
  server: { handlers: routeHandlers(handlers) },
});
