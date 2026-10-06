import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/token/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/token")({
  server: { handlers: routeHandlers(handlers) },
});
