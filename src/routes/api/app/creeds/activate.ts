import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/creeds/activate/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/creeds/activate")({
  server: { handlers: routeHandlers(handlers) },
});
