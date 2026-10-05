import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/authorize/decision/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authorize/decision")({
  server: { handlers: routeHandlers(handlers) },
});
