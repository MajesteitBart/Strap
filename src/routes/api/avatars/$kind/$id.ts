import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/api/avatars/[kind]/[id]/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/avatars/$kind/$id")({
  server: { handlers: routeHandlers(handlers) },
});
