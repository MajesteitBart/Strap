import {
  StrapPageHero,
  StrapSiteFooter,
  StrapSiteHeader,
} from "@/components/marketing/strap-site-shell";
import { isDatabaseConfigured } from "@/lib/env";
import Link from "next/link";

// Legal placeholder. The published sentence is the product's current claim
// and stays verbatim until a privacy policy replaces it.
export function PrivacyPageView() {
  return (
    <div className="strap-site">
      <StrapSiteHeader configured={isDatabaseConfigured()} current="privacy" />

      <main>
        <StrapPageHero
          kicker="Legal"
          kickerTone="paper"
          title="Privacy"
          lede="Privacy information will be published here before Strap begins collecting personal information."
        />

        <div className="strap-wrap strap-page-main">
          <div className="strap-card strap-card-offset strap-tone-context strap-page-main-narrow">
            <div className="strap-card-head">
              <span>
                <b>Privacy policy</b> · status
              </span>
              <span className="strap-pill">Not yet published</span>
            </div>
            <div className="strap-card-body">
              <p>
                Until then, the Stack page lists the services Strap runs on, and the
                documentation explains how connected agents read and update a profile.
              </p>
              <div className="strap-actions">
                <Link className="strap-button strap-button-secondary" href="/stack">
                  See the stack
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
