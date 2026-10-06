import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/skills/[name]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/skills/$name")({
  server: { handlers: routeHandlers(handlers) },
});
