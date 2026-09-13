"use client";

// Shared worktable chrome for every public Strap page: the sticky navigation
// with its signed-in aware CTA and mobile disclosure menu, the column footer,
// and the inner-page hero. `/home` and `/docs` established this system; the
// remaining public routes compose the same pieces so the site reads as one
// product. Server-rendered pages use <StrapSiteHeader>, which owns the auth
// hook; client pages can call useStrapSiteCta themselves.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SystemStatusPill } from "@/components/marketing/system-status";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { useOnboardingResume } from "@/components/marketing/use-onboarding-resume";
import { CONTACT_MAILTO, DISCORD_URL, GITHUB_URL, INSTAGRAM_URL, TWITTER_URL } from "@/lib/branding";
import { BRAND_SITE_URL, BRAND_TAGLINE } from "@/lib/marketing/brand";

export type StrapSitePage =
  | "home"
  | "docs"
  | "pricing"
  | "company"
  | "learn"
  | "examples"
  | "roadmap"
  | "bench"
  | "changelog"
  | "privacy"
  | "terms"
  | "stack";

export type StrapSiteCta = {
  appHref: string;
  appLabel: string;
  signedIn: boolean;
};

type SiteLink = { key: StrapSitePage | "contact"; label: string; href: string; external?: boolean };

const primaryLinks: SiteLink[] = [
  { key: "docs", label: "Docs", href: "/docs" },
  { key: "pricing", label: "Pricing", href: "/pricing" },
  { key: "company", label: "Company", href: "/company" },
  { key: "learn", label: "Learn", href: "/learn" },
  { key: "examples", label: "Examples", href: "/examples" },
];

// Footer columns and the mobile menu share one list so the two never drift.
export const siteLinkGroups: { title: string; links: SiteLink[] }[] = [
  {
    title: "Product",
    links: [
      { key: "pricing", label: "Pricing", href: "/pricing" },
      { key: "company", label: "Company", href: "/company" },
      { key: "examples", label: "Examples", href: "/examples" },
      { key: "roadmap", label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Resources",
    links: [
      { key: "docs", label: "Docs", href: "/docs" },
      { key: "learn", label: "Learn", href: "/learn" },
      { key: "bench", label: "Bench", href: "/bench" },
      { key: "changelog", label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { key: "privacy", label: "Privacy", href: "/privacy" },
      { key: "terms", label: "Terms", href: "/terms" },
      { key: "stack", label: "Stack", href: "/stack" },
      { key: "contact", label: "Contact", href: CONTACT_MAILTO, external: true },
    ],
  },
];

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

function SiteLinkAnchor({
  link,
  current,
  onNavigate,
}: {
  link: SiteLink;
  current?: StrapSitePage;
  onNavigate?: () => void;
}) {
  const isCurrent = link.key === current;
  if (link.external) {
    return (
      <a href={link.href} onClick={onNavigate}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} aria-current={isCurrent ? "page" : undefined} onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

export function StrapSiteNav({
  cta,
  current = "home",
}: {
  cta: StrapSiteCta;
  current?: StrapSitePage;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // The disclosure closes on route change and on Escape so keyboard users
  // are never left inside a menu that no longer matches the page. When the
  // focused element lives inside the menu, focus returns to the toggle so it
  // does not fall back to the document body.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const active = document.activeElement;
      if (active && menuRef.current?.contains(active)) {
        toggleRef.current?.focus();
      }
      setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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
          {primaryLinks.map((link) => (
            <SiteLinkAnchor key={link.key} link={link} current={current} />
          ))}
        </div>
        <Link
          className="strap-button strap-button-primary strap-nav-cta"
          href={cta.appHref}
        >
          {cta.appLabel}
        </Link>
        <button
          ref={toggleRef}
          type="button"
          className="strap-nav-toggle"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close site menu" : "Open site menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="strap-nav-toggle-lines" aria-hidden="true" />
        </button>
      </div>
      <div
        ref={menuRef}
        id={menuId}
        className="strap-nav-menu"
        data-open={menuOpen ? "true" : "false"}
        hidden={!menuOpen}
      >
        <div className="strap-wrap">
          <div className="strap-nav-menu-grid">
            {siteLinkGroups.map((group) => (
              <div className="strap-nav-menu-group" key={group.title}>
                <h2>{group.title}</h2>
                {group.links.map((link) => (
                  <SiteLinkAnchor
                    key={link.key}
                    link={link}
                    current={current}
                    onNavigate={() => setMenuOpen(false)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Server components cannot call the auth hook, so they render this thin
// client wrapper instead of <StrapSiteNav> directly.
export function StrapSiteHeader({
  configured,
  current,
}: {
  configured: boolean;
  current?: StrapSitePage;
}) {
  const cta = useStrapSiteCta(configured);
  return <StrapSiteNav cta={cta} current={current} />;
}

export function StrapSiteFooter() {
  const social = [
    { label: "GitHub", href: GITHUB_URL },
    { label: "X", href: TWITTER_URL },
    { label: "Instagram", href: INSTAGRAM_URL },
    { label: "Discord", href: DISCORD_URL ?? "" },
  ].filter((entry) => entry.href);

  return (
    <footer className="strap-footer">
      <div className="strap-wrap">
        <div className="strap-footer-grid">
          <div className="strap-footer-brand">
            <Link href="/home" aria-label="Strap home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/brand/strap-logo.svg" width="1003" height="257" alt="Strap" />
            </Link>
            <p>{BRAND_TAGLINE}</p>
            <SystemStatusPill href={BRAND_SITE_URL} />
          </div>
          {siteLinkGroups.map((group) => (
            <div className="strap-footer-col" key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <SiteLinkAnchor key={link.key} link={link} />
              ))}
            </div>
          ))}
        </div>
        <div className="strap-footer-row">
          <span>© 2026 Strap · context, skills, and keys for every agent</span>
          <span className="strap-footer-links">
            {social.map((entry) => (
              <a key={entry.label} href={entry.href} target="_blank" rel="noreferrer">
                {entry.label}
              </a>
            ))}
            <span>strap.bvdm.ai</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

// Inner-page hero: kicker chip, display heading, lede, optional actions and
// an optional aside (a card, a manifest, or nothing).
export function StrapPageHero({
  kicker,
  kickerTone,
  title,
  lede,
  actions,
  aside,
  titleId,
}: {
  kicker?: ReactNode;
  kickerTone?: "context" | "skills" | "secrets" | "environments" | "agents" | "paper";
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  titleId?: string;
}) {
  return (
    <header className="strap-page-hero">
      <div className={aside ? "strap-wrap strap-page-hero-grid" : "strap-wrap"}>
        <div className="strap-page-hero-copy">
          {kicker ? (
            <span className={`strap-kicker${kickerTone ? ` strap-kicker-${kickerTone}` : ""}`}>
              {kicker}
            </span>
          ) : null}
          <h1 id={titleId}>{title}</h1>
          {lede ? <p>{lede}</p> : null}
          {actions ? <div className="strap-actions">{actions}</div> : null}
        </div>
        {aside ? <div className="strap-page-hero-aside">{aside}</div> : null}
      </div>
    </header>
  );
}
