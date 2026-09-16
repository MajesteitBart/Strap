import { FaqSection } from "@/components/marketing/faq-section";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { isDatabaseConfigured } from "@/lib/env";
import type { Article, ArticleBlock } from "@/lib/marketing/learn/types";
import { CLUSTER_META } from "@/lib/marketing/learn/types";
import Link from "next/link";

// Server-rendered article view for /learn/[slug]. Everything ships in the
// initial HTML: the lead answer, headings, tables, code, FAQ, and related
// links. No client component wraps the content, so answer engines and no-JS
// crawlers read the whole page.

// Every article's Related list ends with the same product CTA. It lives here,
// not in each article's data, so retargeting it is a one-line change.
const PRODUCT_CTA = { label: "See how Strap works", href: "/home" };

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <figure>
          {block.caption ? <p>{block.caption}</p> : null}
          <div className="strap-table-wrap">
            <table className="strap-table">
              <thead>
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case "code":
      return (
        <pre>
          <code>{block.code}</code>
        </pre>
      );
    case "quote":
      return <blockquote>{block.text}</blockquote>;
  }
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function LearnArticle({ article }: { article: Article }) {
  const leadParagraphs = article.lead.split("\n\n");
  const cluster = CLUSTER_META[article.cluster];

  return (
    <div className="strap-site">
      <StrapSiteHeader configured={isDatabaseConfigured()} current="learn" />

      <main>
        <StrapPageHero
          kicker={`Learn · ${cluster.title}`}
          kickerTone="context"
          title={article.title}
          lede={article.description}
        />

        <div className="strap-wrap strap-page-main">
          <article className="strap-prose strap-tone-context">
            <div className="strap-prose-meta">
              <Link className="strap-link-plain" href="/learn">
                ← All guides
              </Link>
              <span aria-hidden="true">·</span>
              <span>Updated {formatDate(article.dateModified)}</span>
            </div>

            {leadParagraphs.map((para, i) => (
              <p key={i} className="strap-lead">
                {para}
              </p>
            ))}

            {article.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </article>

          {article.faq.length > 0 ? (
            <FaqSection
              heading="Frequently asked questions"
              items={article.faq}
              className="strap-page-main-narrow"
            />
          ) : null}

          <section className="strap-page-section strap-tone-environments strap-page-main-narrow" aria-labelledby="related-title">
            <div className="strap-card strap-card-offset">
              <div className="strap-card-head">
                <span>
                  <b>related</b> · keep reading
                </span>
                <span className="strap-pill">{article.related.length + 1} links</span>
              </div>
              <div className="strap-card-body">
                <h2 id="related-title" className="strap-card-title">Related</h2>
                <ul className="strap-index-list">
                  {[...article.related, PRODUCT_CTA].map((link) => (
                    <li key={link.href}>
                      <Link className="strap-index-row" href={link.href}>
                        <span>{link.label}</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      <StrapSiteFooter />
    </div>
  );
}
