import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/onboarding/compose/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/onboarding/compose")({
  server: { handlers: routeHandlers(handlers) },
});
