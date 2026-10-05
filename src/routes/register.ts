import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/register/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  server: { handlers: routeHandlers(handlers) },
});
