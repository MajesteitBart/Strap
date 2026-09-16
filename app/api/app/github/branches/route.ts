import { requireApiAuth } from "@/lib/api-auth";
import { withCompanyGitHubAccess } from "@/lib/company-github";
import { listGitHubBranches } from "@/lib/github";
import {
  withAuthenticatedGitHubAccess
} from "@/lib/github-version-control";
import { resolveManagedCompanyCreedId } from "@/lib/strap-context";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner")?.trim();
    const repo = searchParams.get("repo")?.trim();

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing repo owner or repo name." }, { status: 400 });
    }

    const { context, user } = auth;
    // Company managers resolve branches on the TEAM token; everyone else on
    // their own connection.
    const companyId = await resolveManagedCompanyCreedId(context, user);
    const branches = companyId
      ? await withCompanyGitHubAccess(companyId, (token) =>
          listGitHubBranches(token, owner, repo)
        )
      : await withAuthenticatedGitHubAccess(({ integration }) =>
          listGitHubBranches(integration.access_token!, owner, repo)
        );

    return NextResponse.json({
      branches: branches.map((branch) => ({
        name: branch.name,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load GitHub branches.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 400 }
    );
  }
}
