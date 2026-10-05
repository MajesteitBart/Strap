import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/vault/folders/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/vault/folders/")({
  server: { handlers: routeHandlers(handlers) },
});
