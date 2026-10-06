import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/auth/signout/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/signout")({
  server: { handlers: routeHandlers(handlers) },
});
