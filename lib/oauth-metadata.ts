import { getSiteUrl } from "@/lib/env";

// RFC 9728 protected-resource metadata, shared by the root well-known route and
// the path-inserted `/mcp` variant. Both serve the identical document (the
// resource is the `/mcp` endpoint). Defined here so each route exports its own
// GET/OPTIONS directly; under Next.js, re-exported route handlers were not
// reliably registered, which made the path-inserted route 405 on every method.
const PRM_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function protectedResourceMetadataPreflight() {
  return new Response(null, { status: 204, headers: PRM_CORS_HEADERS });
}

export function protectedResourceMetadata() {
  const site = getSiteUrl().replace(/\/$/, "");
  return Response.json(
    {
      resource: `${site}/mcp`,
      authorization_servers: [site],
      bearer_methods_supported: ["header"],
    },
    { headers: PRM_CORS_HEADERS }
  );
}
