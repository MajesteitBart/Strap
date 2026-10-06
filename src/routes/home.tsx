import { useDeploymentInfo } from "@/components/deployment-info";
import { JsonLd } from "@/components/marketing/json-ld";
import { StrapHome } from "@/components/marketing/strap-home";
import { homeFaqItems } from "@/lib/marketing/faq";
import { pageHead } from "@/lib/seo/head";
import {
  faqPageSchema,
  graph,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo/structured-data";
import { createFileRoute } from "@tanstack/react-router";

// /home is the canonical public landing (the root `/` redirects here for
// signed-out visitors). It keeps the brand title and the full share card from
// the root route; it only pins the canonical so search and AI engines treat
// /home, not the redirecting root, as the indexable page.
export const Route = createFileRoute("/home")({
  head: () => pageHead({ canonical: "/home" }),
  component: HomeLandingPage,
});

function HomeLandingPage() {
  const { configured } = useDeploymentInfo();
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
      <StrapHome configured={configured} />
    </>
  );
}
