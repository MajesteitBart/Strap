import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/onboarding-status/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/onboarding-status")({
  server: { handlers: routeHandlers(handlers) },
});
