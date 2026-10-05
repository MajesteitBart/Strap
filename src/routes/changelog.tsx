import { JsonLd } from "@/components/marketing/json-ld";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { useDeploymentInfo } from "@/components/deployment-info";
import { changelog } from "@/lib/marketing/changelog";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/changelog";
const TITLE = "Changelog";
const DESCRIPTION =
  "What's new in Strap: recent releases and improvements, newest first.";

export const Route = createFileRoute("/changelog")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  component: ChangelogPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const TONES = ["context", "skills", "secrets", "environments", "agents"] as const;

function ChangelogPage() {
  const { configured } = useDeploymentInfo();
  const latest = changelog[0]?.date;

  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({
            path: PATH,
            name: TITLE,
            description: DESCRIPTION,
            ...(latest ? { dateModified: latest } : {}),
          }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Changelog", path: PATH },
          ])
        )}
      />
      <div className="strap-site">
        <StrapSiteHeader configured={configured} current="changelog" />

        <main>
          <StrapPageHero
            kicker={`Changelog · ${changelog.length} ${changelog.length === 1 ? "release" : "releases"}`}
            kickerTone="skills"
            title="Changelog"
            lede="What's new in Strap, newest first."
          />

          <div className="strap-wrap strap-page-main">
            <div className="strap-timeline">
              {changelog.map((entry, index) => (
                <article
                  key={entry.date}
                  className={`strap-timeline-entry strap-tone-${TONES[index % TONES.length]}`}
                >
                  <div>
                    <time dateTime={entry.date} className="strap-timeline-date">
                      {formatDate(entry.date)}
                    </time>
                  </div>
                  <div className="strap-timeline-body strap-prose">
                    <h2>{entry.title}</h2>
                    <p>{entry.body}</p>
                    {entry.highlights ? (
                      <ul>
                        {entry.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>

        <StrapSiteFooter />
      </div>
    </>
  );
}
