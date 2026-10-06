import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/sitemap.xml/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: routeHandlers(handlers) },
});
