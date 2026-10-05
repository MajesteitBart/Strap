import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/profile/avatar/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/profile/avatar")({
  server: { handlers: routeHandlers(handlers) },
});
