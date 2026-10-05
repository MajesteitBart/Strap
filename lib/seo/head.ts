import { getSiteUrl } from "@/lib/env";
import { BRAND_DESCRIPTION, BRAND_META_TITLE, BRAND_NAME } from "@/lib/marketing/brand";

// Document head tags for routes, shaped for TanStack Router's `head()` option.
//
// The root route emits the brand defaults. A page's tags override the root's
// tag for tag (by meta name/property), and its title gets the "| Strap"
// suffix unless it asks for an absolute title. Share images come from the
// dynamic /api/og route.

export type PageMetadata = {
  title?: string | { absolute: string };
  description?: string;
  /** Path of the canonical URL, resolved against the site origin. */
  canonical?: string;
  openGraph?: {
    type?: "website" | "article";
    url?: string;
    title?: string;
    description?: string;
    publishedTime?: string;
    modifiedTime?: string;
  };
  robots?: string;
};

type MetaTag = Record<string, string>;
type LinkTag = Record<string, string>;
export type HeadTags = { meta: MetaTag[]; links: LinkTag[] };

function absoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

function resolveTitle(title: PageMetadata["title"]) {
  if (!title) return BRAND_META_TITLE;
  return typeof title === "string" ? `${title} | ${BRAND_NAME}` : title.absolute;
}

// Install metadata and icons, the same on every page.
export const ROOT_LINKS: LinkTag[] = [
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", href: "/assets/brand/logo.svg" },
  { rel: "shortcut icon", href: "/assets/brand/logo.svg" },
  { rel: "apple-touch-icon", href: "/assets/brand/strap-touch-icon.png" },
];

export function rootMeta(): MetaTag[] {
  const shareImage = absoluteUrl("/api/og");
  return [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: BRAND_META_TITLE },
    { name: "description", content: BRAND_DESCRIPTION },
    { property: "og:title", content: BRAND_META_TITLE },
    { property: "og:description", content: BRAND_DESCRIPTION },
    { property: "og:site_name", content: BRAND_NAME },
    { property: "og:image", content: shareImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: BRAND_META_TITLE },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: BRAND_META_TITLE },
    { name: "twitter:description", content: BRAND_DESCRIPTION },
    { name: "twitter:image", content: shareImage },
  ];
}

export function pageHead(page: PageMetadata): HeadTags {
  const meta: MetaTag[] = [{ title: resolveTitle(page.title) }];
  if (page.robots) meta.push({ name: "robots", content: page.robots });
  if (page.description) meta.push({ name: "description", content: page.description });
  const og = page.openGraph;
  if (og) {
    if (og.title) meta.push({ property: "og:title", content: og.title });
    if (og.description) meta.push({ property: "og:description", content: og.description });
    if (og.url) meta.push({ property: "og:url", content: absoluteUrl(og.url) });
    if (og.type) meta.push({ property: "og:type", content: og.type });
    if (og.publishedTime) meta.push({ property: "article:published_time", content: og.publishedTime });
    if (og.modifiedTime) meta.push({ property: "article:modified_time", content: og.modifiedTime });
  }
  const links: LinkTag[] = page.canonical ? [{ rel: "canonical", href: absoluteUrl(page.canonical) }] : [];
  return { meta, links };
}
