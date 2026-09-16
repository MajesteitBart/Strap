import { JsonLd } from "@/components/marketing/json-ld";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { isDatabaseConfigured } from "@/lib/env";
import { articlesByCluster, learnArticles } from "@/lib/marketing/learn";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import Link from "next/link";

const PATH = "/learn";
const TITLE = "Learn";
const DESCRIPTION =
  "Guides on personal context files: what they are, how to stop repeating yourself to AI, how to share context across ChatGPT, Claude, and Cursor, and how Strap compares to the memory tools.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

// One resource colour per cluster so the index reads like the docs chapter map.
const CLUSTER_TONES = ["context", "skills", "secrets", "environments", "agents"] as const;

export default function LearnIndexPage() {
  const groups = articlesByCluster();

  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Learn", path: PATH },
          ])
        )}
      />
      <div className="strap-site">
        <StrapSiteHeader configured={isDatabaseConfigured()} current="learn" />

        <main>
          <StrapPageHero
            kicker={`Learn · ${learnArticles.length} guides`}
            kickerTone="context"
            title="Learn"
            lede="How to keep one context file every AI reads before it answers. The category, the common problems, honest comparisons, and how to connect your tools."
            aside={
              <div className="strap-card strap-card-offset strap-tone-context">
                <div className="strap-card-head">
                  <span>
                    <b>guide map</b> · {groups.length} clusters
                  </span>
                  <span className="strap-pill">Index</span>
                </div>
                <ul className="strap-index-list">
                  {groups.map((group, index) => (
                    <li key={group.cluster} className={`strap-tone-${CLUSTER_TONES[index % CLUSTER_TONES.length]}`}>
                      <a href={`#learn-${group.cluster}`} className="strap-index-row">
                        <span>
                          <span className="strap-index-swatch" aria-hidden="true" />
                          {group.title}
                        </span>
                        <span className="strap-text-soft">
                          {group.articles.length} {group.articles.length === 1 ? "guide" : "guides"}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            }
          />

          <div className="strap-wrap strap-page-main">
            {groups.map((group, index) => (
              <section
                key={group.cluster}
                id={`learn-${group.cluster}`}
                className={`strap-page-section strap-tone-${CLUSTER_TONES[index % CLUSTER_TONES.length]}`}
                aria-labelledby={`learn-${group.cluster}-title`}
                style={{ scrollMarginTop: "6rem" }}
              >
                <div className="strap-page-section-head">
                  <div>
                    <h2 id={`learn-${group.cluster}-title`}>{group.title}</h2>
                    <p>{group.blurb}</p>
                  </div>
                  <span className="strap-pill strap-pill-solid">{group.articles.length} {group.articles.length === 1 ? "guide" : "guides"}</span>
                </div>
                <div className="strap-cells" style={{ "--strap-cols": 2 } as React.CSSProperties}>
                  {group.articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/learn/${article.slug}`}
                      className="strap-cell strap-cell-link"
                    >
                      <h3>{article.title}</h3>
                      <p>{article.description}</p>
                      <span className="strap-cell-more">Read guide →</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>

        <StrapSiteFooter />
      </div>
    </>
  );
}
