import { StackPageView } from "@/components/marketing/stack-page-view";
import { JsonLd } from "@/components/marketing/json-ld";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/stack";
const TITLE = "Stack";
const DESCRIPTION =
  "The technology Strap uses to run, store, and process your data.";

export const Route = createFileRoute("/stack")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  component: StackPage,
});

function StackPage() {
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Stack", path: PATH },
          ])
        )}
      />
      <StackPageView />
    </>
  );
}
