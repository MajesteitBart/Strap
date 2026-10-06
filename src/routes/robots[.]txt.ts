import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/robots.txt/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: { handlers: routeHandlers(handlers) },
});
