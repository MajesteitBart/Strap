import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/skills/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/skills/")({
  server: { handlers: routeHandlers(handlers) },
});
