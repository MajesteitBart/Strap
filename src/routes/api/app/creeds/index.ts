import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/creeds/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/creeds/")({
  server: { handlers: routeHandlers(handlers) },
});
