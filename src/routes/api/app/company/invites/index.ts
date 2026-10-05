import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/company/invites/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/company/invites/")({
  server: { handlers: routeHandlers(handlers) },
});
