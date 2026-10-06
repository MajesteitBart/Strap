import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/llms.txt/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/llms.txt")({
  server: { handlers: routeHandlers(handlers) },
});
