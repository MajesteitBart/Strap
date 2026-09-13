import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";

const PATH = "/bench";
const TITLE = "Benchmarks";
const DESCRIPTION =
  "Roadmap: independent Strap benchmark results for context reads and focused update proposals are planned but not yet published.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

// Placeholder rows for the skeleton leaderboard. Widths are deliberately
// unlabeled and unranked; the page promises the benchmark without
// pre-announcing any model's score.
const SKELETON_BARS = [78, 64, 91, 52, 70];

const MEASURES = [
  {
    title: "Reads the context",
    body: "Does the model read the allowed sections before it answers, and does the answer reflect them?",
    tone: "context",
  },
  {
    title: "Respects what it says",
    body: "Do boundaries, preferences, and settled decisions hold across a multi-step task?",
    tone: "secrets",
  },
  {
    title: "Proposes updates worth keeping",
    body: "Are proposed changes narrow, durable, and accepted rather than rejected as noise?",
    tone: "environments",
  },
] as const;

export default function BenchPage() {
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Benchmarks", path: PATH },
          ])
        )}
      />
      <div className="strap-site">
        <StrapSiteHeader configured={isSupabaseConfigured()} current="bench" />

        <main>
          <StrapPageHero
            kicker="Roadmap"
            kickerTone="agents"
            title="Benchmarks"
            lede="Independent results are planned but not published yet. The benchmark will measure how models read Strap context, respect what it says, and propose updates worth keeping."
            actions={
              <>
                <Link className="strap-button strap-button-secondary" href="/roadmap">
                  Read the roadmap
                </Link>
                <Link className="strap-button strap-button-secondary" href="/docs">
                  How agents read Strap
                </Link>
              </>
            }
            aside={
              <div className="strap-card strap-card-offset strap-tone-agents">
                <div className="strap-card-head">
                  <span>
                    <b>leaderboard</b> · not yet published
                  </span>
                  <span className="strap-pill">Preview</span>
                </div>
                <div className="strap-bench" aria-hidden="true" style={{ border: 0 }}>
                  {SKELETON_BARS.map((width, index) => (
                    <div className="strap-bench-row" key={index}>
                      <span className="strap-bench-rank">{index + 1}</span>
                      <span className="strap-bench-track">
                        <span className="strap-bench-fill" style={{ width: `${width}%`, display: "block" }} />
                      </span>
                      <span className="strap-bench-score">tbd</span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          <div className="strap-wrap strap-page-main">
            <section className="strap-page-section" aria-labelledby="bench-measures">
              <div className="strap-page-section-head">
                <div>
                  <h2 id="bench-measures">What the benchmark will measure</h2>
                  <p>Three questions, scored per model, once the method is published.</p>
                </div>
              </div>
              <div className="strap-cells" style={{ "--strap-cols": 3 } as React.CSSProperties}>
                {MEASURES.map((measure, index) => (
                  <article className={`strap-cell strap-tone-${measure.tone}`} key={measure.title}>
                    <span className="strap-cell-number">{index + 1}</span>
                    <h3>{measure.title}</h3>
                    <p>{measure.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>

        <StrapSiteFooter />
      </div>
    </>
  );
}
