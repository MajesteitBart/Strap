import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/sections/[sectionId]/restore/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/sections/$sectionId/restore")({
  server: { handlers: routeHandlers(handlers) },
});
