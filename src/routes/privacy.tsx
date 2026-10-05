import { PrivacyPageView } from "@/components/marketing/privacy-page-view";
import { JsonLd } from "@/components/marketing/json-ld";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/privacy";
const TITLE = "Privacy Policy";
const DESCRIPTION = "How Strap collects, uses, and protects your information.";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Privacy", path: PATH },
          ])
        )}
      />
      <PrivacyPageView />
    </>
  );
}
