import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/vault/[id]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/vault/$id")({
  server: { handlers: routeHandlers(handlers) },
});
