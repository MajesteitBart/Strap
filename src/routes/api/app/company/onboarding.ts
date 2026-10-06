import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/app/company/onboarding/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/app/company/onboarding")({
  server: { handlers: routeHandlers(handlers) },
});
