import { JsonLd } from "@/components/marketing/json-ld";
import { StrapHome } from "@/components/marketing/strap-home";
import { isDatabaseConfigured } from "@/lib/env";
import { homeFaqItems } from "@/lib/marketing/faq";
import {
  faqPageSchema,
  graph,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo/structured-data";
import type { Metadata } from "next";

// /home is the canonical public landing (the root `/` redirects here for
// signed-out visitors). It inherits the brand title.default and the full
// openGraph card from the root layout; we only pin the canonical so search
// and AI engines treat /home, not the redirecting root, as the indexable
// page. (Don't set a partial openGraph here - Next replaces the object
// rather than deep-merging, which would drop the inherited share image.)
export const metadata: Metadata = {
  alternates: { canonical: "/home" },
};

export default function HomeLandingPage() {
  return (
    <>
      <JsonLd
        data={graph(
          organizationSchema(),
          websiteSchema(),
          softwareApplicationSchema(),
          faqPageSchema(homeFaqItems)
        )}
      />
      <StrapHome configured={isDatabaseConfigured()} />
    </>
  );
}
