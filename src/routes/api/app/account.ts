import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/account/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/account")({
  server: { handlers: routeHandlers(handlers) },
});
