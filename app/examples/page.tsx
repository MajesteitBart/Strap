import type { Metadata } from "next";
import { ExamplesPageView } from "@/components/marketing/examples-page-view";
import { JsonLd } from "@/components/marketing/json-ld";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";

const PATH = "/examples";
const TITLE = "Examples";
const DESCRIPTION =
  "Real moments where one shared file changes the answer: allergies and boundaries that hold in every tool, a writing voice that survives a switch, stack conventions that follow you into a fresh repo, and context that is yours to keep.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    type: "article",
    url: PATH,
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ExamplesPage() {
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Examples", path: PATH },
          ])
        )}
      />
      <ExamplesPageView />
    </>
  );
}
