import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/device/decision/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/device/decision")({
  server: { handlers: routeHandlers(handlers) },
});
