import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/device/verify/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/device/verify")({
  server: { handlers: routeHandlers(handlers) },
});
