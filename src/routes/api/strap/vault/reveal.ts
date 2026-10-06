import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/strap/vault/reveal/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/strap/vault/reveal")({
  server: { handlers: routeHandlers(handlers) },
});
