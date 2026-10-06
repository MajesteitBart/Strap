import { JsonLd } from "@/components/marketing/json-ld";
import { LearnArticle } from "@/components/marketing/learn-article";
import { CLUSTER_META } from "@/lib/marketing/learn/types";
import { pageHead } from "@/lib/seo/head";
import {
  articleSchema,
  breadcrumbSchema,
  faqPageSchema,
  graph,
} from "@/lib/seo/structured-data";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getLearnArticle } from "../../functions/learn";

// Every guide is prerendered at build time (crawled from the /learn index);
// unknown slugs are a 404.
export const Route = createFileRoute("/learn/$slug")({
  loader: async ({ params }) => {
    const article = await getLearnArticle({ data: { slug: params.slug } });
    if (!article) throw notFound();
    return article;
  },
  head: ({ loaderData: article }) => {
    if (!article) return {};
    const path = `/learn/${article.slug}`;
    return pageHead({
      title: article.title,
      description: article.description,
      canonical: path,
      openGraph: {
        type: "article",
        url: path,
        title: article.title,
        description: article.description,
        publishedTime: article.datePublished,
        modifiedTime: article.dateModified,
      },
    });
  },
  component: LearnArticlePage,
});

function LearnArticlePage() {
  const article = Route.useLoaderData();
  const path = `/learn/${article.slug}`;

  return (
    <>
      <JsonLd
        data={graph(
          articleSchema({
            path,
            headline: article.title,
            description: article.description,
            datePublished: article.datePublished,
            dateModified: article.dateModified,
          }),
          breadcrumbSchema(path, [
            { name: "Strap", path: "/home" },
            { name: "Learn", path: "/learn" },
            { name: CLUSTER_META[article.cluster].title, path: "/learn" },
            { name: article.title, path },
          ]),
          ...(article.faq.length > 0 ? [faqPageSchema(article.faq)] : [])
        )}
      />
      <LearnArticle article={article} />
    </>
  );
}
