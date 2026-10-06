import { useLocation, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";

export function usePathname() {
  return useLocation({ select: (location) => location.pathname });
}

// Client-side navigation by href, so a path, query string and hash can be
// passed as one string. The router resolves `href` in place of `to`.
export function useAppRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: string) => {
        void router.navigate({ to: ".", href });
      },
      replace: (href: string) => {
        void router.navigate({ to: ".", href, replace: true });
      },
      /** Re-run the current routes' loaders, including the app's access gate. */
      refresh: () => {
        void router.invalidate();
      },
      /** Load the route's code and data ahead of a likely navigation. */
      prefetch: (href: string) => {
        void router.preloadRoute({ to: ".", href }).catch(() => {});
      },
    }),
    [router],
  );
}
