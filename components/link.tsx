import { Link as RouterLink } from "@tanstack/react-router";
import { forwardRef, type AnchorHTMLAttributes } from "react";

// Anchor for internal page links. Paths the router renders navigate client-side
// and preload on hover; external URLs, hash-only links, new-tab links and
// server endpoints (APIs, OAuth callbacks, MCP) fall back to a plain document
// navigation.
type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  /** `false` turns off preloading on hover. */
  prefetch?: boolean;
  replace?: boolean;
  /** `false` keeps the scroll position after navigating. */
  scroll?: boolean;
};

const DOCUMENT_PATH_PREFIXES = ["/api/", "/mcp", "/auth/", "/token", "/register", "/revoke", "/.well-known/"];

export function isDocumentHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return true;
  return DOCUMENT_PATH_PREFIXES.some((prefix) => href === prefix || href.startsWith(prefix));
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch, replace, scroll, target, download, ...props },
  ref,
) {
  if (isDocumentHref(href) || (target && target !== "_self") || download !== undefined) {
    return <a ref={ref} href={href} target={target} download={download} {...props} />;
  }
  return (
    <RouterLink
      ref={ref}
      // `href` (path, query and hash) takes precedence over `to`.
      to="."
      href={href}
      target={target}
      replace={replace}
      resetScroll={scroll}
      preload={prefetch === false ? false : undefined}
      {...props}
    />
  );
});

export default Link;
