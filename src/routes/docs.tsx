import { DocsPageView } from "@/components/marketing/docs-page-view";
import { JsonLd } from "@/components/marketing/json-ld";
import { useDeploymentInfo } from "@/components/deployment-info";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import { pageHead } from "@/lib/seo/head";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/docs";
const TITLE = "Docs";
const DESCRIPTION =
  "What Strap is, what belongs in your profile, how to connect agents over MCP, how they read and improve it, the Company plan, and the full tool and HTTP API reference.";

export const Route = createFileRoute("/docs")({
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  component: DocsPage,
});

function DocsPage() {
  const { configured } = useDeploymentInfo();
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Docs", path: PATH },
          ])
        )}
      />
      <DocsPageView configured={configured} />
    </>
  );
}
