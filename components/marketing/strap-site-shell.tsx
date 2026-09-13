"use client";

import Link from "next/link";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { useOnboardingResume } from "@/components/marketing/use-onboarding-resume";

export type StrapSiteCta = {
  appHref: string;
  appLabel: string;
  signedIn: boolean;
};

export function useStrapSiteCta(configured: boolean): StrapSiteCta {
  const authState = useLandingAuthState(configured);
  const signedIn = authState === "signed-in";
  const canResume = useOnboardingResume(configured) && !signedIn;

  return {
    signedIn,
    appHref: signedIn ? "/file" : canResume ? "/onboarding" : "/signup",
    appLabel: signedIn
      ? "Open Strap"
      : canResume
        ? "Resume setup"
        : "Equip an agent",
  };
}

export function StrapSiteNav({
  cta,
  current = "home",
}: {
  cta: StrapSiteCta;
  current?: "home" | "docs";
}) {
  const homePrefix = current === "home" ? "" : "/home";

  return (
    <nav className="strap-nav" aria-label="Primary navigation">
      <div className="strap-wrap strap-navbar">
        <Link className="strap-wordmark" href="/home" aria-label="Strap home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/strap-logo.svg"
            width="1003"
            height="257"
            alt="Strap"
          />
        </Link>
        <div className="strap-nav-links">
          <a href={`${homePrefix}#resources`}>Resources</a>
          <a href={`${homePrefix}#context`}>Context</a>
          <a href={`${homePrefix}#skills`}>Skills</a>
          <a href={`${homePrefix}#secrets`}>Keys</a>
          <Link
            href="/docs"
            aria-current={current === "docs" ? "page" : undefined}
          >
            Docs
          </Link>
        </div>
        <Link
          className="strap-button strap-button-primary strap-nav-cta"
          href={cta.appHref}
        >
          {cta.appLabel}
        </Link>
      </div>
    </nav>
  );
}

export function StrapSiteFooter() {
  return (
    <footer className="strap-footer">
      <div className="strap-wrap strap-footer-row">
        <span>Strap · context, skills, and keys for every agent</span>
        <span className="strap-footer-links">
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/changelog">Changelog</Link>
        </span>
      </div>
    </footer>
  );
}
