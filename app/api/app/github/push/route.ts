import { NextResponse } from "next/server";
import { loadCreedState, persistCreedState } from "@/lib/strap-backend";
import { pushGitHubFile } from "@/lib/github";
import {
  getConfiguredRepo,
  requireAuthenticatedUser,
  resolveGitHubProfileSnapshot,
  withAuthenticatedGitHubAccess,
} from "@/lib/github-version-control";
import { resolveManagedCompanyCreedId } from "@/lib/strap-context";
import { withCompanyGitHubAccess } from "@/lib/company-github";
import { readCompanyVersionControl, updateCompanyVersionControlSync } from "@/lib/company-version-control";
import { hasProfilePathConflict, LEGACY_CREED_FILE_NAME } from "@/lib/profile-file";

type PushBody = {
  markdown?: string;
  localHash?: string;
  message?: string;
};

const LEGACY_PATH_CONFLICT = `This repository already contains ${LEGACY_CREED_FILE_NAME}. Pull that file first to keep using it, or migrate it explicitly before creating strap.md.`;
const COMPANY_LEGACY_PATH_CONFLICT = `This company repository already contains ${LEGACY_CREED_FILE_NAME}. Rename that remote file to strap.md before pushing, or have an operator explicitly migrate the stored company path to ${LEGACY_CREED_FILE_NAME}.`;

function assertNoFallbackConflict(
  configuredPath: string,
  resolvedPath?: string,
  message = LEGACY_PATH_CONFLICT,
) {
  if (hasProfilePathConflict(configuredPath, resolvedPath)) {
    throw new Error(message);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PushBody;
    const markdown = body.markdown?.trim();
    const localHash = body.localHash?.trim();
    const message = body.message?.trim() || "Update Strap";

    if (!markdown || !localHash) {
      return NextResponse.json({ error: "Missing markdown or local hash." }, { status: 400 });
    }

    const { supabase, user } = await requireAuthenticatedUser();

    // Company managers push the company file to the COMPANY target on the TEAM's
    // GitHub connection (never a personal token); the sync bookkeeping lands on
    // the company row. Personal Straps push on the user's own connection.
    const companyId = await resolveManagedCompanyCreedId(supabase, user);
    if (companyId) {
      const companyVc = await readCompanyVersionControl(companyId);
      const companyRepo = getConfiguredRepo(companyVc);
      if (!companyRepo) {
        throw new Error("Version control is not configured yet. Choose a repo in Settings first");
      }
      const payload = await withCompanyGitHubAccess(companyId, async (token) => {
        const remote = await resolveGitHubProfileSnapshot(token, companyRepo);
        assertNoFallbackConflict(
          companyRepo.path,
          remote?.path,
          COMPANY_LEGACY_PATH_CONFLICT,
        );
        const result = await pushGitHubFile({
          accessToken: token,
          owner: companyRepo.repoOwner,
          repo: companyRepo.repoName,
          branch: companyRepo.branch,
          path: companyRepo.path,
          message,
          content: markdown,
          currentSha: remote?.snapshot.sha ?? null,
        });
        return result;
      });
      await updateCompanyVersionControlSync(companyId, {
        lastRemoteSha: payload.sha,
        lastRemoteMessage: payload.message,
        lastRemoteCommittedAt: payload.committedAt,
        lastSyncedContentHash: localHash,
        syncStatus: "up-to-date",
      });
      return NextResponse.json({
        ok: true,
        syncStatus: "up-to-date" as const,
        remoteSha: payload.sha,
        remoteMessage: payload.message,
        remoteCommittedAt: payload.committedAt,
      });
    }

    const result = await withAuthenticatedGitHubAccess(async ({
      supabase: personalSupabase,
      user: personalUser,
      integration,
      versionControl,
    }) => {
      const configuredRepo = getConfiguredRepo(versionControl);

      if (!configuredRepo) {
        throw new Error("GitHub version control is not configured yet. Choose a repo in Settings first");
      }

      const remoteFile = await resolveGitHubProfileSnapshot(
        integration.access_token!,
        configuredRepo,
      );
      assertNoFallbackConflict(configuredRepo.path, remoteFile?.path);

      const pushResult = await pushGitHubFile({
        accessToken: integration.access_token!,
        owner: configuredRepo.repoOwner,
        repo: configuredRepo.repoName,
        branch: configuredRepo.branch,
        path: configuredRepo.path,
        message,
        content: markdown,
        currentSha: remoteFile?.snapshot.sha ?? null,
      });

      const loaded = await loadCreedState(personalSupabase, personalUser);
      const nextState = {
        ...loaded.state,
        settings: {
          ...loaded.state.settings,
          versionControl: {
            ...loaded.state.settings.versionControl,
            repoOwner: configuredRepo.repoOwner,
            repoName: configuredRepo.repoName,
            branch: configuredRepo.branch,
            path: configuredRepo.path,
            lastRemoteSha: pushResult.sha,
            lastRemoteMessage: pushResult.message,
            lastRemoteCommittedAt: pushResult.committedAt,
            lastSyncedContentHash: localHash,
            syncStatus: "up-to-date" as const,
          },
        },
      };

      await persistCreedState(personalSupabase, personalUser.id, nextState);

      return {
        ok: true,
        syncStatus: "up-to-date" as const,
        remoteSha: pushResult.sha,
        remoteMessage: pushResult.message,
        remoteCommittedAt: pushResult.committedAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not push Strap to GitHub.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : message === LEGACY_PATH_CONFLICT ? 409 : 400 }
    );
  }
}
