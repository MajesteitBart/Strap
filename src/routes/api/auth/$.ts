import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/auth/[...all]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: routeHandlers(handlers) },
});
