import { NextResponse } from "next/server";
import { parseCreedMarkdown } from "@/lib/creed-markdown";
import {
  getConfiguredRepo,
  resolveGitHubProfileSnapshot,
  resolveSyncStatus,
  withAuthenticatedGitHubAccess,
} from "@/lib/github-version-control";
import { resolveManagedCompanyCreedId } from "@/lib/creed-context";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { localHash?: string };
    const payload = await withAuthenticatedGitHubAccess(async ({
      supabase,
      user,
      integration,
      versionControl,
    }) => {
      // Pulling GitHub into a shared company file (an import that overwrites
      // sections) is not supported yet; company managers push out only.
      if (await resolveManagedCompanyCreedId(supabase, user)) {
        throw new Error("Pulling from GitHub into a company Strap isn't supported yet. You can push to GitHub.");
      }
      const configuredRepo = getConfiguredRepo(versionControl);

      if (!configuredRepo) {
        throw new Error("GitHub version control is not configured yet. Choose a repo in Settings first");
      }

      const resolvedRemote = await resolveGitHubProfileSnapshot(
        integration.access_token!,
        configuredRepo,
      );

      if (!resolvedRemote) {
        throw new Error("No compatible Strap file exists in this repo yet. Push first");
      }

      const { path, snapshot: remoteFile } = resolvedRemote;

      const parsed = parseCreedMarkdown(remoteFile.content);
      const syncStatus = resolveSyncStatus({
        localHash: body.localHash?.trim() ?? "",
        remoteHash: remoteFile.contentHash,
        lastSyncedHash: versionControl?.last_synced_content_hash ?? null,
      });

      return {
        repoOwner: configuredRepo.repoOwner,
        repoName: configuredRepo.repoName,
        branch: configuredRepo.branch,
        path,
        syncStatus,
        remoteSha: remoteFile.sha,
        remoteMessage: remoteFile.commitMessage ?? null,
        remoteCommittedAt: remoteFile.committedAt ?? null,
        remoteContentHash: remoteFile.contentHash,
        warnings: parsed.warnings,
        sections: parsed.sections,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not preview GitHub import.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : message.includes("No compatible Strap file") ? 404 : 400 }
    );
  }
}
