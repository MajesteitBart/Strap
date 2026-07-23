import { NextResponse } from "next/server";
import {
  getConfiguredRepo,
  hasLinkedGitHubIdentity,
  requireAuthenticatedUser,
  resolveGitHubProfileSnapshot,
  resolveSyncStatus,
  withAuthenticatedGitHubAccess,
} from "@/lib/github-version-control";
import { readGitHubIntegration, readVersionControlConfig } from "@/lib/creed-backend";
import { resolveManagedCompanyCreedId } from "@/lib/creed-context";
import { readCompanyVersionControl } from "@/lib/company-version-control";
import {
  readCompanyGitHubIntegration,
  withCompanyGitHubAccess,
} from "@/lib/company-github";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const localHash = searchParams.get("localHash")?.trim() ?? "";
    const { supabase, user } = await requireAuthenticatedUser();

    // Company managers resolve status against the TEAM connection + the company
    // target. Members and personal Creeds resolve against their own.
    const companyId = await resolveManagedCompanyCreedId(supabase, user);
    if (companyId) {
      const companyVc = await readCompanyVersionControl(companyId);
      const configuredRepo = getConfiguredRepo(companyVc);
      const integration = await readCompanyGitHubIntegration(companyId);
      const connected = Boolean(integration?.accessToken);

      if (!connected || !configuredRepo) {
        return NextResponse.json({
          connected,
          configured: false,
          syncStatus: "not-configured",
        });
      }

      const payload = await withCompanyGitHubAccess(companyId, async (token) => {
        const resolvedRemote = await resolveGitHubProfileSnapshot(token, configuredRepo);
        const remoteFile = resolvedRemote?.snapshot;
        return {
          connected: true,
          configured: true,
          repoOwner: configuredRepo.repoOwner,
          repoName: configuredRepo.repoName,
          branch: configuredRepo.branch,
          path: resolvedRemote?.path ?? configuredRepo.path,
          syncStatus: resolveSyncStatus({
            localHash,
            remoteHash: remoteFile?.contentHash ?? null,
            lastSyncedHash: companyVc?.last_synced_content_hash ?? null,
          }),
          remoteSha: remoteFile?.sha ?? null,
          remoteMessage: remoteFile?.commitMessage ?? null,
          remoteCommittedAt: remoteFile?.committedAt ?? null,
          remoteContentHash: remoteFile?.contentHash ?? null,
        };
      });
      return NextResponse.json(payload);
    }

    const integration = await readGitHubIntegration(supabase, user.id);
    const versionControl = await readVersionControlConfig(supabase, user.id);
    const configuredRepo = getConfiguredRepo(versionControl);

    const linkedIdentity = hasLinkedGitHubIdentity(user);

    if (!integration?.access_token || !configuredRepo) {
      return NextResponse.json({
        connected: Boolean(integration?.access_token) || linkedIdentity,
        configured: false,
        syncStatus: "not-configured",
      });
    }

    const payload = await withAuthenticatedGitHubAccess(async ({ integration: activeIntegration }) => {
      const resolvedRemote = await resolveGitHubProfileSnapshot(
        activeIntegration.access_token!,
        configuredRepo,
      );
      const remoteFile = resolvedRemote?.snapshot;

      const syncStatus = resolveSyncStatus({
        localHash,
        remoteHash: remoteFile?.contentHash ?? null,
        lastSyncedHash: versionControl?.last_synced_content_hash ?? null,
      });

      return {
        connected: true,
        configured: true,
        repoOwner: configuredRepo.repoOwner,
        repoName: configuredRepo.repoName,
        branch: configuredRepo.branch,
        path: resolvedRemote?.path ?? configuredRepo.path,
        syncStatus,
        remoteSha: remoteFile?.sha ?? null,
        remoteMessage: remoteFile?.commitMessage ?? null,
        remoteCommittedAt: remoteFile?.committedAt ?? null,
        remoteContentHash: remoteFile?.contentHash ?? null,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load GitHub status.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 400 }
    );
  }
}
