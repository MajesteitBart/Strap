import Link from "next/link";
import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Legal placeholder. The published sentence is the product's current claim
// and stays verbatim until terms replace it.
export function TermsPageView() {
  return (
    <div className="strap-site">
      <StrapSiteHeader configured={isSupabaseConfigured()} current="terms" />

      <main>
        <StrapPageHero
          kicker="Legal"
          kickerTone="paper"
          title="Terms"
          lede="Terms will be published here before Strap introduces terms that require your agreement."
        />

        <div className="strap-wrap strap-page-main">
          <div className="strap-card strap-card-offset strap-tone-secrets strap-page-main-narrow">
            <div className="strap-card-head">
              <span>
                <b>Terms and conditions</b> · status
              </span>
              <span className="strap-pill">Not yet published</span>
            </div>
            <div className="strap-card-body">
              <p>
                Until then, the pricing page describes what Strap offers today, and the
                documentation describes how the product behaves.
              </p>
              <div className="strap-actions">
                <Link className="strap-button strap-button-secondary" href="/pricing">
                  See pricing
                </Link>
                <Link className="strap-button strap-button-secondary" href="/docs">
                  Read the docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StrapSiteFooter />
    </div>
  );
}
