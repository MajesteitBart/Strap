import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/vault/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/vault/")({
  server: { handlers: routeHandlers(handlers) },
});
