import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/company/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/company/")({
  server: { handlers: routeHandlers(handlers) },
});
