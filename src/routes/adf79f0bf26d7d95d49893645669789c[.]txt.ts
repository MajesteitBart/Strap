import { routeHandlers } from "@/lib/http/route-handlers";
import * as handlers from "@/server/adf79f0bf26d7d95d49893645669789c.txt/route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/adf79f0bf26d7d95d49893645669789c.txt")({
  server: { handlers: routeHandlers(handlers) },
});
