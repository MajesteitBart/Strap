import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/company/members/[userId]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/company/members/$userId")({
  server: { handlers: routeHandlers(handlers) },
});
