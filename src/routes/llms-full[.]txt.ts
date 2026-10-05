import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/llms-full.txt/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/llms-full.txt")({
  server: { handlers: routeHandlers(handlers) },
});
