import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/device/authorize/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/device/authorize")({
  server: { handlers: routeHandlers(handlers) },
});
