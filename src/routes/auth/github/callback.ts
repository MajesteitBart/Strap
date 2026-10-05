import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/auth/github/callback/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/github/callback")({
  server: { handlers: routeHandlers(handlers) },
});
