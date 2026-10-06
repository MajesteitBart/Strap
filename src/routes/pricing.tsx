import { JsonLd } from "@/components/marketing/json-ld";
import { PricingPageView } from "@/components/marketing/pricing-page-view";
import { PricingReference } from "@/components/marketing/pricing-reference";
import { useDeploymentInfo } from "@/components/deployment-info";
import { pricingFaqItems } from "@/lib/marketing/faq";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  softwareApplicationSchema,
  webPageSchema,
} from "@/lib/seo/structured-data";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/pricing";
const TITLE = "Pricing";
const DESCRIPTION =
  "Strap is free: self-host the open source build, or use the hosted app with Personal and Company Straps at no charge. Use the agents you already connect. Strap runs no in-app LLM calls and needs no model API key.";

const DATE_MODIFIED = "2026-07-07";

export const Route = createFileRoute("/pricing")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  component: PricingPage,
});

function PricingPage() {
  const { configured } = useDeploymentInfo();
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({
            path: PATH,
            name: "Strap pricing",
            description: DESCRIPTION,
            dateModified: DATE_MODIFIED,
          }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Pricing", path: PATH },
          ]),
          softwareApplicationSchema(),
          faqPageSchema(pricingFaqItems)
        )}
      />
      <PricingPageView configured={configured} reference={<PricingReference />} />
    </>
  );
}
