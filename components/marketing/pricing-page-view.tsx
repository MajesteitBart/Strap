"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Star, X } from "lucide-react";
import {
  ArrowUpRightIcon,
  type ArrowUpRightIconHandle,
} from "@/components/ui/arrow-up-right";
import { AnimatedPageTitle } from "@/components/marketing/animated-page-title";
import {
  MarketingFooter,
  MarketingHeroBanner,
} from "@/components/marketing/site-chrome";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { GITHUB_URL } from "@/lib/branding";
import { cn } from "@/lib/utils";

type Feature = { label: string; included: boolean; star?: boolean };

const SHARED_FEATURES: Feature[] = [
  { label: "Full Creed editor with rich components", included: true },
  { label: "All MCP connections and integrations", included: true },
  { label: "Quality scoring and inline diff review", included: true },
];

const FREE_EXTRAS: Feature[] = [
  { label: "Bring your own AI key", included: true },
  { label: "Cross-device sync and backups", included: false },
  { label: "Managed backend, auth and storage", included: false },
];

const PERSONAL_FEATURES: Feature[] = [
  ...SHARED_FEATURES,
  { label: "Included AI or BYOK", included: true },
  { label: "Cross-device sync and backups", included: true },
  { label: "Managed backend, auth and storage", included: true },
];

// The Company card collapses all of Personal into a single ticked line, then
// lists the company-workspace exclusives as gold stars.
const COMPANY_FEATURES: Feature[] = [
  { label: "Everything in Personal", included: true },
  { label: "Shared Company Creed", included: true, star: true },
  { label: "See activity across every member", included: true, star: true },
  { label: "Invite your whole team", included: true, star: true },
  { label: "Admin controls for members", included: true, star: true },
];

export function PricingPageView({ reference }: { reference?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const githubHref = GITHUB_URL ?? "https://github.com";

  return (
    <div className="min-h-screen bg-[var(--creed-background)] text-[var(--creed-text-primary)]">
      <MarketingHeroBanner configured scrolled={scrolled} />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:px-10 md:pb-24 md:pt-10">
        <div className="flex flex-col gap-6 border-b border-[var(--creed-border)] pb-8">
          <div>
            <AnimatedPageTitle text="Pricing" />
            <p className="t-lede mt-5 max-w-2xl text-[var(--creed-text-secondary)]">
              Creed is free. Run it yourself, or skip the setup and use the
              hosted app.
            </p>
          </div>
        </div>

        <section className="py-10 md:py-12">
          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            <PricingCard
              name="Open"
              nameClassName="text-[var(--creed-border-strong)]"
              price="$0"
              cadence="forever"
              tagline="Self-host the open source build."
              features={[...SHARED_FEATURES, ...FREE_EXTRAS]}
              cta={
                <ExternalCta
                  cta={{
                    label: "View on GitHub",
                    href: githubHref,
                    style: "outline",
                  }}
                />
              }
            />
            <PricingCard
              name="Personal"
              nameClassName="text-[var(--creed-accent)]"
              price="$0"
              cadence="forever"
              tagline="Your hosted Creed, synced everywhere."
              features={PERSONAL_FEATURES}
              cta={<PersonalCta />}
            />
            <PricingCard
              name="Company"
              nameClassName="text-[#F59E0B] dark:text-[#F5A623]"
              price="$0"
              cadence="forever"
              tagline="One shared Creed for your whole team."
              features={COMPANY_FEATURES}
              cta={<CompanyCta />}
            />
          </div>

          <p className="mt-7 text-center text-[13px] leading-6 text-[var(--creed-text-tertiary)]">
            AI features run on the deployment&apos;s included key, with BYOK
            available when you want model spend on your own key.
          </p>
        </section>

        {reference}
      </main>

      <MarketingFooter />
    </div>
  );
}

function PricingCard({
  name,
  nameClassName,
  price,
  cadence,
  tagline,
  features,
  cta,
}: {
  name: string;
  nameClassName: string;
  price: string;
  cadence: string;
  tagline: string;
  features: Feature[];
  cta: ReactNode;
}) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl bg-[var(--creed-surface)] p-6 md:p-7">
      <div>
        <div
          className={cn(
            "text-[40px] font-semibold leading-none tracking-[-0.02em]",
            nameClassName,
          )}
        >
          {name}
        </div>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-[36px] font-semibold leading-none tracking-[-0.02em] text-[var(--creed-text-primary)]">
            {price}
          </span>
          <span className="text-[13px] font-medium text-[var(--creed-text-tertiary)]">
            {cadence}
          </span>
        </div>
        <p className="mt-3 text-[14px] leading-6 text-[var(--creed-text-secondary)]">
          {tagline}
        </p>
      </div>

      <div className="my-6 h-px bg-[var(--creed-border)]" />

      <ul className="flex-1 space-y-2.5">
        {features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5">
            <span className="mt-[5px] inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center">
              {feature.star ? (
                <Star
                  className="h-[14px] w-[14px] fill-[#F59E0B] text-[#F59E0B] dark:fill-[#F5A623] dark:text-[#F5A623]"
                  strokeWidth={2.75}
                />
              ) : feature.included ? (
                <Check
                  className="h-[14px] w-[14px] text-[#16A34A]"
                  strokeWidth={2.75}
                />
              ) : (
                <X
                  className="h-[14px] w-[14px] text-[#DC2626] dark:text-[#F87171]"
                  strokeWidth={2.75}
                />
              )}
            </span>
            <span
              className={cn(
                "text-[14px] leading-6",
                feature.included
                  ? "text-[var(--creed-text-primary)]"
                  : "text-[var(--creed-text-tertiary)]",
              )}
            >
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-7">{cta}</div>
    </div>
  );
}

function ExternalCta({
  cta,
}: {
  cta: { label: string; href: string; style: "solid" | "outline" };
}) {
  const arrowRef = useRef<ArrowUpRightIconHandle | null>(null);
  return (
    <a
      href={cta.href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => arrowRef.current?.startAnimation()}
      onMouseLeave={() => arrowRef.current?.stopAnimation()}
      className={ctaClass(cta.style)}
    >
      {cta.label}
      {cta.style === "outline" ? (
        <ArrowUpRightIcon
          ref={arrowRef}
          size={16}
          className="inline-flex h-4 w-4 items-center justify-center"
        />
      ) : null}
    </a>
  );
}

// Personal: signed-out visitors sign in and land in onboarding; signed-in
// users go straight to their file.
function PersonalCta() {
  const authState = useLandingAuthState();

  if (authState === "signed-in") {
    return (
      <Link href="/file" className={ctaClass("solid")}>
        Go to app
      </Link>
    );
  }
  return (
    <GoogleSignInButton
      label="Get Started"
      showIcon={false}
      redirectTo="/onboarding"
      className={ctaClass("solid")}
    />
  );
}

// Company: a signed-in user creates (or resumes) their company Creed directly;
// signed-out visitors sign in first and land back here to create it.
function CompanyCta() {
  const authState = useLandingAuthState();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

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
        throw new Error(data.error || "Could not create the company Creed.");
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
        className={ctaClass("solid", "amber")}
      >
        {creating ? "Creating" : "Create a company"}
      </button>
    );
  }
  return (
    <GoogleSignInButton
      label="Get Started"
      showIcon={false}
      redirectTo="/pricing"
      className={ctaClass("solid", "amber")}
    />
  );
}

function ctaClass(
  style: "solid" | "outline",
  tone: "blue" | "amber" = "blue",
) {
  if (style === "solid") {
    // Company CTAs are amber to match the "Company" wordmark; everything else
    // is the blue primary.
    const color =
      tone === "amber"
        ? "bg-[#F59E0B] hover:bg-[#D97706] dark:bg-[#F5A623] dark:hover:bg-[#E0951E]"
        : "bg-[var(--creed-accent)] hover:bg-[var(--creed-accent-hover)]";
    return `inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md ${color} px-4 text-[14px] font-medium text-white transition-colors disabled:opacity-70`;
  }
  return "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-[var(--creed-border)] bg-transparent px-4 text-[14px] font-medium text-[var(--creed-text-primary)] transition-colors hover:bg-[var(--creed-surface-raised)]";
}
