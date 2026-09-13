"use client";

import { useEffect, useState } from "react";
import { AnimatedPageTitle } from "@/components/marketing/animated-page-title";
import {
  MarketingFooter,
  MarketingHeroBanner,
} from "@/components/marketing/site-chrome";

export function TermsPageView() {
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

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8 md:px-10 md:pb-24 md:pt-10">
        <div className="border-b border-[var(--strap-border)] pb-8">
          <AnimatedPageTitle text="Terms" />
          <p className="t-lede mt-5 max-w-2xl text-[var(--strap-text-secondary)]">
            Terms will be published here before Strap introduces terms that
            require your agreement.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
