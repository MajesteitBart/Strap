import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/company/general/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/company/general")({
  server: { handlers: routeHandlers(handlers) },
});
