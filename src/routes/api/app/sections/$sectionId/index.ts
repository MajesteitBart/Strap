import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/sections/[sectionId]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/sections/$sectionId/")({
  server: { handlers: routeHandlers(handlers) },
});
