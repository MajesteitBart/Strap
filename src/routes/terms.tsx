import { TermsPageView } from "@/components/marketing/terms-page-view";
import { JsonLd } from "@/components/marketing/json-ld";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/terms";
const TITLE = "Terms and Conditions";
const DESCRIPTION = "The rules that govern your use of Strap.";

export const Route = createFileRoute("/terms")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Terms", path: PATH },
          ])
        )}
      />
      <TermsPageView />
    </>
  );
}
