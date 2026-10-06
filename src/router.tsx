import { NotFoundPage } from "@/components/not-found-page";
import { RouteError } from "@/components/route-error";
import { parseSearch, stringifySearch } from "@/lib/http/search-params";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    parseSearch,
    stringifySearch,
    scrollRestoration: true,
    defaultPreload: "intent",
    // Pending fallbacks show only while data is actually loading.
    defaultPendingMinMs: 0,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFoundPage,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
