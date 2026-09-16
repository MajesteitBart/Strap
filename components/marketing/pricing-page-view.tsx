"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteNav,
  useStrapSiteCta,
} from "@/components/marketing/strap-site-shell";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { useOAuthSignIn } from "@/components/auth/use-oauth-sign-in";
import { GITHUB_URL } from "@/lib/branding";

type Feature = { label: string; included: boolean; star?: boolean };

const SHARED_FEATURES: Feature[] = [
  { label: "Full Strap editor with rich components", included: true },
  { label: "MCP with OAuth, device flow, or scoped keys", included: true },
  { label: "Agent proposals and inline diff review", included: true },
];

const FREE_EXTRAS: Feature[] = [
  { label: "Use your existing agents", included: true },
  { label: "Cross-device sync and backups", included: false },
  { label: "Managed backend, auth and storage", included: false },
];

const PERSONAL_FEATURES: Feature[] = [
  ...SHARED_FEATURES,
  { label: "Cross-device sync and backups", included: true },
  { label: "Managed backend, auth and storage", included: true },
  { label: "Profile-scoped API-key Vault", included: true },
  { label: "Strap CLI and GitHub sync", included: true },
];

// The Company card collapses all of Personal into a single ticked line, then
// lists the company-workspace exclusives as stars.
const COMPANY_FEATURES: Feature[] = [
  { label: "Everything in Personal", included: true },
  { label: "Shared Company Strap", included: true, star: true },
  { label: "See activity across every member", included: true, star: true },
  { label: "Invite your whole team", included: true, star: true },
  { label: "Admin controls for members", included: true, star: true },
];

export function PricingPageView({
  reference,
  configured = true,
}: {
  reference?: ReactNode;
  configured?: boolean;
}) {
  const cta = useStrapSiteCta(configured);
  const githubHref = GITHUB_URL || "https://github.com";

  return (
    <div className="strap-site">
      <StrapSiteNav cta={cta} current="pricing" />

      <main>
        <StrapPageHero
          kicker="Pricing · three ways to run Strap"
          kickerTone="environments"
          title="Strap is free."
          lede="Run it yourself, or skip the setup and use the hosted app. Personal and Company Straps cost nothing."
        />

        <div className="strap-wrap strap-page-main">
          <section className="strap-page-section" aria-labelledby="pricing-plans">
            <h2 id="pricing-plans" className="sr-only">
              Plans
            </h2>
            <div className="strap-plans">
              <PricingCard
                name="Open"
                tone="environments"
                chip="Self-hosted"
                price="$0"
                cadence="forever"
                tagline="Self-host the open source build."
                features={[...SHARED_FEATURES, ...FREE_EXTRAS]}
                cta={
                  <a
                    className="strap-button strap-button-secondary"
                    href={githubHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub <span aria-hidden="true">→</span>
                  </a>
                }
              />
              <PricingCard
                name="Personal"
                tone="context"
                chip="Hosted"
                price="$0"
                cadence="forever"
                tagline="Your hosted Strap, synced everywhere."
                features={PERSONAL_FEATURES}
                cta={<PersonalCta configured={configured} />}
              />
              <PricingCard
                name="Company"
                tone="agents"
                chip="Hosted · team"
                price="$0"
                cadence="forever"
                tagline="One shared Strap for your whole team."
                features={COMPANY_FEATURES}
                cta={<CompanyCta configured={configured} />}
              />
            </div>
            <p className="strap-plans-note">
              Your connected agents propose improvements. You approve or decline them in Strap.
            </p>
          </section>

          {reference}
        </div>
      </main>

      <StrapSiteFooter />
    </div>
  );
}

function PricingCard({
  name,
  tone,
  chip,
  price,
  cadence,
  tagline,
  features,
  cta,
}: {
  name: string;
  tone: "context" | "environments" | "agents";
  chip: string;
  price: string;
  cadence: string;
  tagline: string;
  features: Feature[];
  cta: ReactNode;
}) {
  return (
    <article className={`strap-plan strap-tone-${tone}`} aria-label={`${name} plan`}>
      <span className="strap-chip">{chip}</span>
      <div className="strap-plan-name">{name}</div>
      <div className="strap-plan-price">
        <strong>{price}</strong>
        <span>{cadence}</span>
      </div>
      <p className="strap-plan-tagline">{tagline}</p>
      <ul className="strap-plan-list">
        {features.map((feature) => (
          <li key={feature.label} data-included={feature.included ? "true" : "false"}>
            <span
              className={
                feature.star
                  ? "strap-plan-glyph strap-plan-glyph-star"
                  : feature.included
                    ? "strap-plan-glyph"
                    : "strap-plan-glyph strap-plan-glyph-no"
              }
              aria-label={feature.star ? "Company exclusive" : feature.included ? "Included" : "Not included"}
            >
              {feature.star ? "★" : feature.included ? "✓" : "×"}
            </span>
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>
      <div className="strap-plan-cta">{cta}</div>
    </article>
  );
}

// Personal: signed-out visitors sign in and land in onboarding; signed-in
// users go straight to their file.
function PersonalCta({ configured }: { configured: boolean }) {
  const authState = useLandingAuthState(configured);
  const { signIn, pendingProvider } = useOAuthSignIn(configured, "/onboarding");
  const loading = pendingProvider === "google";

  if (authState === "signed-in") {
    return (
      <Link href="/file" className="strap-button strap-button-primary">
        Go to app
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="strap-button strap-button-primary"
      onClick={() => void signIn("google")}
      disabled={loading || !configured}
    >
      {loading ? "Redirecting" : "Get started"}
    </button>
  );
}

// Company: a signed-in user creates (or resumes) their Company Strap directly;
// signed-out visitors sign in first and land back here to create it.
function CompanyCta({ configured }: { configured: boolean }) {
  const authState = useLandingAuthState(configured);
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { signIn, pendingProvider } = useOAuthSignIn(configured, "/pricing");
  const loading = pendingProvider === "google";

  async function createCompany() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/app/company", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        creedId?: string;
        error?: string;
      };
      if (!res.ok || !data.creedId) {
        throw new Error(data.error || "Could not create the company Strap.");
      }
      router.push("/onboarding/company");
    } catch {
      setCreating(false);
    }
  }

  if (authState === "signed-in") {
    return (
      <button
        type="button"
        onClick={() => void createCompany()}
        disabled={creating}
        className="strap-button strap-button-agents"
      >
        {creating ? "Creating" : "Create a company"}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="strap-button strap-button-agents"
      onClick={() => void signIn("google")}
      disabled={loading || !configured}
    >
      {loading ? "Redirecting" : "Get started"}
    </button>
  );
}
