import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/headless-access/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/headless-access/")({
  server: { handlers: routeHandlers(handlers) },
});
