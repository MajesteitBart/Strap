"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRightIcon,
  type ArrowUpRightIconHandle,
} from "@/components/ui/arrow-up-right";
import { AnimatedPageTitle } from "@/components/marketing/animated-page-title";
import { MarketingFooter, MarketingHeroBanner } from "@/components/marketing/site-chrome";

const stackRows = [
  {
    name: "Next.js, React, and TypeScript",
    purpose: "Application framework, user interface, and strict implementation language",
    website: "https://nextjs.org",
  },
  {
    name: "Tailwind CSS, Tiptap, and Motion",
    purpose: "Styling, rich-text editing, and interaction motion",
    website: "https://tailwindcss.com",
  },
  {
    name: "Supabase",
    purpose: "Authentication, Postgres, RLS, realtime, storage, and Vault",
    website: "https://supabase.com",
  },
  {
    name: "Netlify",
    purpose: "Hosted application deployment and edge delivery",
    website: "https://netlify.com",
  },
  {
    name: "OpenRouter",
    purpose: "Included-key and bring-your-own-key AI model access",
    website: "https://openrouter.ai",
  },
  {
    name: "MCP and OAuth 2.1",
    purpose: "Browser, device, CLI, and scoped headless agent connections",
    website: "https://modelcontextprotocol.io",
  },
  {
    name: "GitHub",
    purpose: "Optional version control and synchronization for strap.md",
    website: "https://github.com",
  },
  {
    name: "Resend",
    purpose: "Transactional Company invitation email",
    website: "https://resend.com",
  },
] as const;

export function StackPageView() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--strap-background)] text-[var(--strap-text-primary)]">
      <MarketingHeroBanner configured scrolled={scrolled} />

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-8 md:px-10 md:pb-24 md:pt-10">
        <div className="border-b border-[var(--strap-border)] pb-8">
          <AnimatedPageTitle text="Stack" />
          <p className="t-lede mt-5 max-w-2xl text-[var(--strap-text-secondary)]">
            The technology Strap uses to run, store, and process your data.
          </p>
        </div>

        <section className="py-8 md:py-10">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--strap-border)]">
                <th className="px-1 py-4 text-[13px] font-medium text-[var(--strap-text-tertiary)] md:px-2">
                  Name
                </th>
                <th className="px-1 py-4 text-[13px] font-medium text-[var(--strap-text-tertiary)] md:px-2">
                  Purpose
                </th>
                <th className="px-1 py-4 text-[13px] font-medium text-[var(--strap-text-tertiary)] md:px-2">
                  Website
                </th>
              </tr>
            </thead>
            <tbody>
              {stackRows.map((row, index) => (
                <tr
                  key={row.name}
                  className={index === stackRows.length - 1 ? "" : "border-b border-[var(--strap-border)]"}
                >
                  <td className="px-1 py-5 text-[16px] font-medium text-[var(--strap-text-primary)] md:px-2 md:text-[17px]">
                    {row.name}
                  </td>
                  <td className="px-1 py-5 text-[15px] leading-7 text-[var(--strap-text-secondary)] md:px-2 md:text-[16px]">
                    {row.purpose}
                  </td>
                  <td className="px-1 py-5 md:px-2">
                    <StackLink href={row.website} label={row.website.replace(/^https?:\/\//, "")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-8 text-[15px] leading-7 text-[var(--strap-text-secondary)] md:text-[16px]">
            Strap keeps application data and credentials behind the access
            boundaries described in the{" "}
            <a
              href="/privacy"
              className="font-medium text-[var(--strap-accent)] hover:text-[var(--strap-accent-hover)]"
            >
              Privacy Policy
            </a>
            . Vault values remain server-side, hidden sections stay out of
            agent payloads, and service-role operations require explicit
            application authorization.
          </p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

// External-link row used by the stack table. Hovering the anchor triggers
// the arrow's bounce-shrink animation via the icon's imperative handle.
function StackLink({ href, label }: { href: string; label: string }) {
  const arrowRef = useRef<ArrowUpRightIconHandle | null>(null);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => arrowRef.current?.startAnimation()}
      onMouseLeave={() => arrowRef.current?.stopAnimation()}
      className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--strap-accent)] transition-colors hover:text-[var(--strap-accent-hover)] md:text-[16px]"
    >
      {label}
      <ArrowUpRightIcon ref={arrowRef} size={16} className="inline-flex h-4 w-4 items-center justify-center" />
    </a>
  );
}
