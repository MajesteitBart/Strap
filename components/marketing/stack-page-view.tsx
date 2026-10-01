import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { isDatabaseConfigured } from "@/lib/env";
import Link from "next/link";

const stackRows = [
  {
    name: "Next.js, React, and TypeScript",
    purpose: "Application framework, user interface, and strict implementation language",
    website: "https://nextjs.org",
    tone: "context",
  },
  {
    name: "Tailwind CSS, Tiptap, and Motion",
    purpose: "Styling, rich-text editing, and interaction motion",
    website: "https://tailwindcss.com",
    tone: "context",
  },
  {
    name: "Postgres, Drizzle, and Better Auth",
    purpose: "Database, application authorization, and account authentication",
    website: "https://www.postgresql.org",
    tone: "secrets",
  },
  {
    name: "Netlify",
    purpose: "Hosted application deployment and edge delivery",
    website: "https://netlify.com",
    tone: "environments",
  },
  {
    name: "MCP and OAuth 2.1",
    purpose: "Browser, device, CLI, and scoped headless agent connections",
    website: "https://modelcontextprotocol.io",
    tone: "agents",
  },
  {
    name: "GitHub",
    purpose: "Optional version control and synchronization for strap.md",
    website: "https://github.com",
    tone: "skills",
  },
  {
    name: "Resend",
    purpose: "Account verification, password resets, and Company invitations",
    website: "https://resend.com",
    tone: "skills",
  },
] as const;

export function StackPageView() {
  return (
    <div className="strap-site">
      <StrapSiteHeader configured={isDatabaseConfigured()} current="stack" />

      <main>
        <StrapPageHero
          kicker={`Stack · ${stackRows.length} services`}
          kickerTone="environments"
          title="Stack"
          lede="The technology Strap uses to run, store, and process your data."
        />

        <div className="strap-wrap strap-page-main">
          <section className="strap-page-section" aria-labelledby="stack-services">
            <div className="strap-page-section-head">
              <div>
                <h2 id="stack-services">Services and what they do</h2>
                <p>
                  Every service on the table, with the job it does for Strap and where
                  to read its own documentation.
                </p>
              </div>
            </div>
            <div className="strap-table-wrap">
              <table className="strap-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Purpose</th>
                    <th scope="col">Website</th>
                  </tr>
                </thead>
                <tbody>
                  {stackRows.map((row) => (
                    <tr key={row.name}>
                      <td>
                        <span className={`strap-tone-${row.tone}`}>
                          <span className="strap-swatch" style={{ background: "var(--strap-tone)" }} aria-hidden="true" />
                        </span>
                        {row.name}
                      </td>
                      <td>{row.purpose}</td>
                      <td>
                        <a href={row.website} target="_blank" rel="noreferrer">
                          {row.website.replace(/^https?:\/\//, "")}
                          <span aria-hidden="true"> ↗</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="strap-page-section strap-tone-secrets" aria-labelledby="stack-boundaries">
            <div className="strap-card strap-card-offset strap-page-main-narrow">
              <div className="strap-card-head">
                <span>
                  <b>Access boundaries</b> · how data stays put
                </span>
                <span className="strap-pill">Vault</span>
              </div>
              <div className="strap-card-body">
                <h3 id="stack-boundaries">Credentials stay behind explicit boundaries</h3>
                <p>
                  Strap keeps application data and credentials behind the access boundaries
                  described in the <Link className="strap-link-plain" href="/privacy">Privacy Policy</Link>.
                  Vault values remain server-side, hidden sections stay out of agent payloads,
                  and service-role operations require explicit application authorization.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <StrapSiteFooter />
    </div>
  );
}
