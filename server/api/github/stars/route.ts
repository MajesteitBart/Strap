// Public GitHub star count for the project repo, fetched server-side and cached
// (hourly) so the marketing star button shows a live number without every
// visitor hitting the GitHub API. This is a deliberate external call (GitHub),
// the only one besides the system-status pill; it fails closed to `stars: null`
// so the button degrades to just the icon if GitHub is unreachable.
import { GITHUB_URL } from "@/lib/branding";
import { memoize } from "@/lib/http/memo";

const HOUR_MS = 60 * 60 * 1000;
const CACHE_HEADERS = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=31532400",
} as const;

function repoSlug(): string | null {
  const match = GITHUB_URL.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  return match ? `${match[1]}/${match[2].replace(/\.git$/, "")}` : null;
}

async function fetchStars(slug: string): Promise<number | null> {
  const res = await fetch(`https://api.github.com/repos/${slug}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
  const data = (await res.json()) as { stargazers_count?: number };
  return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
}

export async function GET() {
  const slug = repoSlug();
  if (!slug) {
    return Response.json({ stars: null }, { headers: CACHE_HEADERS });
  }

  try {
    const stars = await memoize(`github-stars:${slug}`, HOUR_MS, () => fetchStars(slug));
    return Response.json({ stars }, { headers: CACHE_HEADERS });
  } catch {
    return Response.json({ stars: null });
  }
}
