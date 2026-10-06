import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/sections/[sectionId]/versions/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/sections/$sectionId/versions")({
  server: { handlers: routeHandlers(handlers) },
});
