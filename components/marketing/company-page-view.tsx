import { FaqSection } from "@/components/marketing/faq-section";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { isDatabaseConfigured } from "@/lib/env";
import { companyFaqItems } from "@/lib/marketing/faq";
import Link from "next/link";

// Server-rendered Company plan landing page. All content ships in the initial
// HTML so crawlers and answer engines read the full pitch, roles, and pricing
// without running JavaScript.

const ROLES = [
  {
    name: "Owner",
    body: "Manages members, company settings, and content. Every team has one.",
    tone: "context",
  },
  {
    name: "Admin",
    body: "Manages members and content. Keeps the shared Strap sharp.",
    tone: "environments",
  },
  {
    name: "Member",
    body: "Reads the shared Strap and proposes updates their work reveals.",
    tone: "agents",
  },
] as const;

const HOW = [
  {
    title: "One shared file",
    body: "A Company Strap is the same structured profile as a personal one, owned by the team. It holds how you work, what you are building, and the conventions everyone should follow.",
  },
  {
    title: "Every agent reads it",
    body: "Members connect their own agents over MCP and read the shared Strap before they act, so answers match how the team actually operates instead of drifting.",
  },
  {
    title: "Proposals, not sludge",
    body: "Agents propose narrow updates as they learn. Section permissions decide who edits directly and who proposes, and every change is attributed.",
  },
  {
    title: "See the activity",
    body: "The activity view shows reads, proposals, and edits across every member and agent, so the shared context stays accountable.",
  },
] as const;

const MEMBERS = [
  ["Owner", "company settings · members · content", "✓ Direct"],
  ["Admin", "members · content", "✓ Direct"],
  ["Member", "reads · proposes", "△ Proposes"],
] as const;

export function CompanyPageView() {
  return (
    <div className="strap-site">
      <StrapSiteHeader configured={isDatabaseConfigured()} current="company" />

      <main>
        <StrapPageHero
          kicker="Company Strap · free for every member"
          kickerTone="agents"
          title="One shared context file your whole team's agents read"
          lede="The Company plan adds one shared Company Strap on top of your personal one. Every member's agents read the same company context before they answer, so you stop re-explaining how the team works to every tool. Roles, section permissions, an activity view, and admin controls come built in."
          actions={
            <>
              <Link className="strap-button strap-button-primary" href="/pricing">
                See Company pricing
              </Link>
              <Link className="strap-button strap-button-secondary" href="/learn/team-context-file">
                What is a team context file?
              </Link>
            </>
          }
          aside={
            <div className="strap-kit" aria-label="Company Strap roles summary">
              <span className="strap-backing strap-backing-one" aria-hidden="true" />
              <span className="strap-backing strap-backing-two" aria-hidden="true" />
              <div className="strap-manifest">
                <span className="strap-chip strap-chip-ready">Team</span>
                <div className="strap-manifest-head">
                  <span className="strap-mono">
                    <b>company strap</b> · one file, three roles
                  </span>
                </div>
                {MEMBERS.map(([role, scope, status]) => (
                  <div className="strap-manifest-line" key={role}>
                    <span
                      className={`strap-swatch strap-bg-${role === "Owner" ? "context" : role === "Admin" ? "skills" : "secrets"}`}
                      aria-hidden="true"
                    />
                    <span>{role.toLowerCase()}</span>
                    <span className="strap-manifest-source">{scope}</span>
                    <span className="strap-check">{status}</span>
                  </div>
                ))}
                <div className="strap-pattern" aria-hidden="true" />
              </div>
            </div>
          }
        />

        <div className="strap-wrap strap-page-main">
          <section className="strap-page-section strap-tone-context" aria-labelledby="company-how">
            <div className="strap-page-section-head">
              <div>
                <h2 id="company-how">How a Company Strap works</h2>
                <p>The same profile model as Personal, owned by the team and read by every member&apos;s agents.</p>
              </div>
            </div>
            <div className="strap-cells" style={{ "--strap-cols": 2 } as React.CSSProperties}>
              {HOW.map((item, index) => (
                <article className="strap-cell" key={item.title}>
                  <span className="strap-cell-number">{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="strap-page-section" aria-labelledby="company-roles">
            <div className="strap-page-section-head">
              <div>
                <h2 id="company-roles">Roles that keep the file trusted</h2>
                <p>
                  A shared file only stays useful if edits are governed. Roles and
                  section permissions decide who can change what, and every edit is
                  attributed.
                </p>
              </div>
            </div>
            <div className="strap-cells" style={{ "--strap-cols": 3 } as React.CSSProperties}>
              {ROLES.map((role) => (
                <article className={`strap-cell strap-tone-${role.tone}`} key={role.name}>
                  <span className="strap-cell-label strap-cell-label-solid">{role.name}</span>
                  <p>{role.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="strap-page-section strap-tone-environments" aria-labelledby="company-free">
            <div className="strap-card strap-card-offset">
              <div className="strap-card-head">
                <span>
                  <b>pricing</b> · Company Strap
                </span>
                <span className="strap-pill strap-pill-ready">$0 forever</span>
              </div>
              <div className="strap-card-body">
                <h2 id="company-free" style={{ fontSize: "clamp(1.4rem, 2.2vw, 1.85rem)" }}>
                  Free for your whole team
                </h2>
                <p>
                  A Company Strap is free: invite as many members as you need, and
                  run AI on the included key or your company&apos;s own key (BYOK).
                </p>
                <div className="strap-actions">
                  <Link className="strap-button strap-button-primary" href="/pricing">
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <FaqSection heading="Company plan questions" items={companyFaqItems} tone="agents" />
        </div>
      </main>

      <StrapSiteFooter />
    </div>
  );
}
