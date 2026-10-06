import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/manifest.webmanifest/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/manifest.webmanifest")({
  server: { handlers: routeHandlers(handlers) },
});
