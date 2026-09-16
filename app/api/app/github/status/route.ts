import { requireApiAuth } from "@/lib/api-auth";
import {
  readCompanyGitHubIntegration,
  withCompanyGitHubAccess,
} from "@/lib/company-github";
import { readCompanyVersionControl } from "@/lib/company-version-control";
import {
  getConfiguredRepo,
  hasLinkedGitHubIdentity,
  resolveGitHubProfileSnapshot,
  resolveSyncStatus,
  withAuthenticatedGitHubAccess
} from "@/lib/github-version-control";
import { readGitHubIntegration, readVersionControlConfig } from "@/lib/strap-backend";
import { resolveManagedCompanyCreedId } from "@/lib/strap-context";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const localHash = searchParams.get("localHash")?.trim() ?? "";
    const { context, user } = auth;

    // Company managers resolve status against the TEAM connection + the company
    // target. Members and Personal Straps resolve against their own.
    const companyId = await resolveManagedCompanyCreedId(context, user);
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

    const integration = await readGitHubIntegration(context, user.id);
    const versionControl = await readVersionControlConfig(context, user.id);
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
