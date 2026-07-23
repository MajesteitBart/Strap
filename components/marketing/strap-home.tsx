"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { useOnboardingResume } from "@/components/marketing/use-onboarding-resume";
import { BRAND_TAGLINE } from "@/lib/marketing/brand";

const resources = [
  {
    key: "context",
    label: "Context",
    body: "Briefs, conventions, and current state. Everything an agent reads before it starts.",
    sample: "context/project.md",
  },
  {
    key: "skills",
    label: "Skills",
    body: "Proven procedures, installed only on the agents that need them.",
    sample: "skill://deploy",
  },
  {
    key: "secrets",
    label: "Secrets",
    body: "Approved credentials with scope and health. References, never raw values.",
    sample: "secret://prod/deploy",
  },
  {
    key: "environments",
    label: "Environments",
    body: "Named places to work, so every agent knows where it stands.",
    sample: "env: staging",
  },
  {
    key: "agents",
    label: "Agents",
    body: "Every agent shows what it carries and what it's allowed to use.",
    sample: "agent: clark · 6 skills",
  },
] as const;

const chapters = [
  {
    key: "context",
    title: "Put project knowledge and operating rules in one context layer.",
    body: "A context pack bundles Strap profiles, project briefs, conventions, and environment notes. Versioned, validated, and assigned per agent.",
    action: "Explore context",
  },
  {
    key: "skills",
    title: "Store proven procedures once and equip them wherever agents work.",
    body: "A skill is one job with an identifier, a version, and a scope. Equip the agents that need it. Leave the rest in the library.",
    action: "Browse skills",
  },
  {
    key: "secrets",
    title: "Connect agents to approved credentials without scattering secrets across machines.",
    body: "Every secret is a reference with a scope. Strap shows what it opens, who can use it, and when it was last resolved.",
    action: "Manage secrets",
  },
] as const;

function Status({ tone = "ready", children }: { tone?: "ready" | "syncing" | "warning"; children: ReactNode }) {
  return <span className={`strap-status strap-status-${tone}`}>{children}</span>;
}

function ManifestLine({ kind, label, source }: { kind: "context" | "skills" | "secrets"; label: string; source: string }) {
  return (
    <div className="strap-manifest-line">
      <span className={`strap-swatch strap-bg-${kind}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="strap-manifest-source">{source}</span>
      <span className="strap-check" aria-label="Ready">✓</span>
    </div>
  );
}

function ContextProof() {
  return (
    <div className="strap-proof-ui">
      <div className="strap-proof-bar"><span>context-pack: bvdm-core</span><span>4 sources · 2 agents</span></div>
      {[
        ["strap.md", "v14 · updated 2d ago", "ready", "✓ Ready"],
        ["context/conventions.md", "v9 · updated 6d ago", "ready", "✓ Ready"],
        ["context/env-notes.md", "v3 · updated 1h ago", "syncing", "… Syncing"],
        ["briefs/q3-delivery.md", "v2 · updated 12d ago", "warning", "△ Verify"],
      ].map(([name, meta, tone, status]) => (
        <div className="strap-proof-row strap-proof-row-context" key={name}>
          <span className="strap-mono">{name}</span>
          <span className="strap-dim">{meta}</span>
          <Status tone={tone as "ready" | "syncing" | "warning"}>{status}</Status>
        </div>
      ))}
    </div>
  );
}

function SkillsProof() {
  const skills = [
    ["Address PR feedback", "Work through review comments and push fixes", "pr-feedback", "v2.1"],
    ["Prepare research brief", "Collect sources and draft a structured brief", "research-brief", "v1.4"],
    ["Validate deployment", "Run checks against a fresh deploy target", "validate-deploy", "v3.0"],
    ["Draft release note", "Summarise merged changes for a release", "release-note", "v1.0"],
  ];
  return (
    <div className="strap-proof-ui">
      <div className="strap-proof-bar"><span>skills library</span><span>23 skills · 6 equipped</span></div>
      <div className="strap-skill-grid">
        {skills.map(([name, job, id, version], index) => (
          <div className="strap-skill-tile" key={id}>
            <strong>{name}</strong>
            <span className="strap-dim">{job}</span>
            <div><span className="strap-mono">skill://{id} · {version}</span><Status tone={index === 2 ? "warning" : "ready"}>{index === 2 ? "△ Verify" : "✓ Ready"}</Status></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecretsProof() {
  const secrets = [
    ["GITHUB_TOKEN", "github · prod", "resolved 4m ago", true],
    ["OPENAI_API_KEY", "openai · prod", "resolved 1h ago", true],
    ["SUPABASE_SECRET", "supabase · dev", "resolved 3d ago", true],
    ["MONEYBIRD_API", "moneybird · prod", "never resolved", false],
  ] as const;
  return (
    <div className="strap-proof-ui">
      <div className="strap-proof-bar"><span>secret references</span><span>values hidden</span></div>
      {secrets.map(([name, scope, resolved, ready]) => (
        <div className="strap-proof-row strap-proof-row-secret" key={name}>
          <span className="strap-mono">{name}</span>
          <span className="strap-dim">{scope}</span>
          <span className="strap-dim">{resolved}</span>
          <Status tone={ready ? "ready" : "warning"}>{ready ? "✓ Ready" : "× Missing"}</Status>
        </div>
      ))}
    </div>
  );
}

function ChapterProof({ kind }: { kind: "context" | "skills" | "secrets" }) {
  return (
    <div className={`strap-proof strap-proof-${kind}`}>
      <span className="strap-proof-shape strap-proof-shape-one" aria-hidden="true" />
      <span className="strap-proof-shape strap-proof-shape-two" aria-hidden="true" />
      {kind === "context" ? <ContextProof /> : kind === "skills" ? <SkillsProof /> : <SecretsProof />}
    </div>
  );
}

export function StrapHome({ configured }: { configured: boolean }) {
  const authState = useLandingAuthState(configured);
  const signedIn = authState === "signed-in";
  const canResume = useOnboardingResume(configured) && !signedIn;
  const appHref = signedIn ? "/file" : canResume ? "/onboarding" : "/signup";
  const appLabel = signedIn ? "Open Strap" : canResume ? "Resume setup" : "Equip an agent";

  return (
    <div className="strap-site">
      <nav className="strap-nav" aria-label="Primary navigation">
        <div className="strap-wrap strap-navbar">
          <Link className="strap-wordmark" href="/home" aria-label="Strap home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/brand/strap-logo.svg" width="1003" height="257" alt="Strap" />
          </Link>
          <div className="strap-nav-links">
            <a href="#resources">Resources</a>
            <a href="#context">Context</a>
            <a href="#skills">Skills</a>
            <a href="#secrets">Secrets</a>
            <Link href="/docs">Docs</Link>
          </div>
          <Link className="strap-button strap-button-primary strap-nav-cta" href={appHref}>{appLabel}</Link>
        </div>
      </nav>

      <main>
        <header className="strap-hero">
          <div className="strap-wrap strap-hero-grid">
            <div className="strap-hero-copy">
              <h1>{BRAND_TAGLINE}</h1>
              <p>Pack once. Every agent picks up the same versioned kit.</p>
              <div className="strap-actions">
                <Link className="strap-button strap-button-primary" href={appHref}>{appLabel}</Link>
                <Link className="strap-button strap-button-secondary" href="/docs">Read the docs</Link>
              </div>
            </div>

            <div className="strap-kit" aria-label="Agent manifest showing context, skills, and secrets ready for use">
              <span className="strap-backing strap-backing-one" aria-hidden="true" />
              <span className="strap-backing strap-backing-two" aria-hidden="true" />
              <div className="strap-manifest">
                <span className="strap-chip strap-chip-ready">Ready</span>
                <div className="strap-manifest-head">
                  <strong><span className="strap-swatch strap-bg-agents" aria-hidden="true" />agent: clark</strong>
                  <span className="strap-mono">env: <b>production</b> · synced 2m ago</span>
                </div>
                <ManifestLine kind="context" label="context · 4 packs" source="strap.md +3" />
                <ManifestLine kind="skills" label="skills · 6 equipped" source="review, deploy…" />
                <ManifestLine kind="secrets" label="secrets · 3 references" source="values hidden" />
                <div className="strap-pattern" aria-hidden="true" />
              </div>
              <Link className="strap-manifest-cta" href={appHref}><span>Open Strap</span><span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </header>

        <section className="strap-section" id="resources">
          <div className="strap-wrap">
            <div className="strap-section-head">
              <h2>Everything on the table, colour-coded.</h2>
              <p>Each resource keeps its colour across Strap. Learn it once, read every manifest at a glance.</p>
            </div>
            <div className="strap-resource-grid">
              {resources.map((resource) => (
                <article className={`strap-resource strap-resource-${resource.key}`} key={resource.key}>
                  <span className="strap-chip">{resource.label}</span>
                  <p>{resource.body}</p>
                  <span className="strap-resource-sample strap-mono">{resource.sample}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {chapters.map((chapter) => (
          <section className="strap-section strap-chapter" id={chapter.key} key={chapter.key}>
            <div className="strap-wrap strap-chapter-grid">
              <div className="strap-chapter-copy">
                <h2>{chapter.title}</h2>
                <p>{chapter.body}</p>
              </div>
              <div className="strap-proof-wrap">
                <ChapterProof kind={chapter.key} />
                <Link className="strap-flush-tab" href={chapter.key === "secrets" ? "/vault" : chapter.key === "context" ? "/file" : "/docs"}>{chapter.action}</Link>
              </div>
            </div>
          </section>
        ))}

        <section className="strap-section strap-assembly">
          <div className="strap-wrap">
            <div className="strap-section-head">
              <h2>A kit comes together in four moves.</h2>
            </div>
            <div className="strap-assembly-box">
              <span className="strap-chip">$ strap equip clark --env production</span>
              {[
                ["Stack context", "bvdm-core v14 synced · strap.md +3 sources", "Synced"],
                ["Snap in skills", "6 of 23 equipped · the rest stay in the library", "Equipped"],
                ["Lock the secrets", "GITHUB_TOKEN resolved · production · 09:41", "Resolved"],
                ["Hand it over", "clark starts with its whole kit visible", "Ready"],
              ].map(([title, detail, status], index) => (
                <div className="strap-assembly-row" key={title}>
                  <span className={`strap-assembly-number strap-assembly-number-${index + 1}`}>{index + 1}</span>
                  <span className="strap-mono"><strong>{title}</strong><small>{detail}</small></span>
                  <Status>✓ {status}</Status>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="strap-section strap-closing">
          <div className="strap-wrap">
            <div className="strap-closing-box">
              <h2>Set the table. Start the work.</h2>
              <p>One kit for every agent you rely on.</p>
              <Link className="strap-button strap-button-secondary" href={appHref}>{appLabel}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="strap-footer">
        <div className="strap-wrap strap-footer-row">
          <span>Strap · context, skills, and secrets for every agent</span>
          <span className="strap-footer-links"><Link href="/docs">Docs</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/changelog">Changelog</Link></span>
        </div>
      </footer>
    </div>
  );
}
