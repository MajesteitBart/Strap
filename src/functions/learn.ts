import { getArticle } from "@/lib/marketing/learn";
import { createServerFn } from "@tanstack/react-start";

// Guides are rendered at build time. The browser receives only the guide it is
// showing, not the whole library.
export const getLearnArticle = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({ slug: typeof input?.slug === "string" ? input.slug : "" }))
  .handler(({ data }) => getArticle(data.slug) ?? null);
