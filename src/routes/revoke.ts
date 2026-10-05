import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/revoke/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/revoke")({
  server: { handlers: routeHandlers(handlers) },
});
