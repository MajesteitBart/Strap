import { CompanyPageView } from "@/components/marketing/company-page-view";
import { JsonLd } from "@/components/marketing/json-ld";
import { companyFaqItems } from "@/lib/marketing/faq";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  softwareApplicationSchema,
  webPageSchema,
} from "@/lib/seo/structured-data";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/company";
const TITLE = "Company plan";
const DESCRIPTION =
  "The Company Strap: one shared file every member's agents read, with roles, section permissions, an activity view, and admin controls. Free for your whole team.";
const DATE_MODIFIED = "2026-07-07";

export const Route = createFileRoute("/company")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  component: CompanyPage,
});

function CompanyPage() {
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({
            path: PATH,
            name: "Strap Company plan",
            description: DESCRIPTION,
            dateModified: DATE_MODIFIED,
          }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Company", path: PATH },
          ]),
          softwareApplicationSchema(),
          faqPageSchema(companyFaqItems)
        )}
      />
      <CompanyPageView />
    </>
  );
}
