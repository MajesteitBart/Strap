import { JsonLd } from "@/components/marketing/json-ld";
import { RoadmapPageView } from "@/components/marketing/roadmap-page-view";
import { fetchRoadmap } from "@/lib/marketing/fetch-roadmap";
import { pageHead } from "@/lib/seo/head";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const PATH = "/roadmap";
const TITLE = "Roadmap";
const DESCRIPTION =
  "A live view of what we're building, straight from Strap's task board.";

// The median API key is read server-side in fetchRoadmap and never reaches the
// client; only the mapped, public-safe columns are passed down.
const getRoadmap = createServerFn({ method: "GET" }).handler(() => fetchRoadmap());

// Rendered per request rather than at build time, so moving a task between
// phases on the median board shows up within about a minute with no redeploy.
// The CDN serves the page for 60s and then refreshes it in the background;
// median has no webhooks, so this is the freshest it can be while the page
// stays cached. The page reads no cookies, so it never touches user state.
export const Route = createFileRoute("/roadmap")({
  loader: () => getRoadmap(),
  head: () => pageHead({ title: TITLE, description: DESCRIPTION, canonical: PATH }),
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=31535940",
    "Netlify-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=31535940, durable",
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const columns = Route.useLoaderData();
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Strap", path: "/home" },
            { name: "Roadmap", path: PATH },
          ])
        )}
      />
      <RoadmapPageView columns={columns} />
    </>
  );
}
