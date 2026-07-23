import { NextResponse } from "next/server";
import type { CreedSection } from "@/lib/creed-data";
import { loadCreedState, persistCreedState } from "@/lib/creed-backend";
import { requireAuthenticatedUser } from "@/lib/github-version-control";
import { resolveManagedCompanyCreedId } from "@/lib/creed-context";
import { canAdoptResolvedProfilePath } from "@/lib/profile-file";

type ApplyBody = {
  sections?: CreedSection[];
  remoteSha?: string | null;
  remoteMessage?: string | null;
  remoteCommittedAt?: string | null;
  remoteContentHash?: string | null;
  remotePath?: string | null;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    // Applying a GitHub import overwrites sections via the personal full-state
    // persist, which is blocked for company Creeds; guard it explicitly.
    if (await resolveManagedCompanyCreedId(supabase, user)) {
      return NextResponse.json(
        { error: "Pulling from GitHub into a company Strap isn't supported yet. You can push to GitHub." },
        { status: 400 }
      );
    }
    const body = (await request.json()) as ApplyBody;

    if (!Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json({ error: "Missing imported sections." }, { status: 400 });
    }

    const result = await loadCreedState(supabase, user);
    const remotePath = body.remotePath?.trim();
    if (
      remotePath &&
      !canAdoptResolvedProfilePath(result.state.settings.versionControl.path, remotePath)
    ) {
      return NextResponse.json({ error: "Invalid remote profile path." }, { status: 400 });
    }
    // Pull is authoritative. Force every imported section to be
    // agent-writable so connected agents (Codex / Claude / MCP clients)
    // can edit them post-pull. Without this, sections inherit the
    // parser's historical `agentWritable: false` and the MCP contract
    // reports zero editable sections. Healing here also fixes rows that
    // a prior pull wrote with `false`. The next pull rewrites them.
    const existingById = new Map(
      result.state.sections.map((section) => [section.id, section])
    );
    const importedSections = body.sections.map((section) => {
      // Older remote files carry no accent marker, so the parser falls back
      // to "custom" (mono). Keep the locally stored color in that case.
      const existing = existingById.get(section.id);
      const accent =
        section.accent === "custom" && existing && !existing.archived
          ? existing.accent
          : section.accent;
      return {
        ...section,
        accent,
        agentWritable: true,
        agentPermission: "propose" as const,
      };
    });
    // Archived sections never appear in the pushed markdown, so a pull must
    // not delete them - they stay restorable from Settings. Retain any that
    // the import didn't reintroduce under the same id.
    const importedIds = new Set(importedSections.map((section) => section.id));
    const retainedArchived = result.state.sections.filter(
      (section) => section.archived && !importedIds.has(section.id)
    );
    const nextState = {
      ...result.state,
      lastSavedAt: Date.now(),
      sections: [...importedSections, ...retainedArchived],
      proposals: [],
      settings: {
        ...result.state.settings,
        versionControl: {
          ...result.state.settings.versionControl,
          path: remotePath || result.state.settings.versionControl.path,
          lastRemoteSha: body.remoteSha ?? undefined,
          lastRemoteMessage: body.remoteMessage ?? undefined,
          lastRemoteCommittedAt: body.remoteCommittedAt ?? undefined,
          lastSyncedContentHash: body.remoteContentHash ?? undefined,
          syncStatus: "up-to-date" as const,
        },
      },
      mutationTick: result.state.mutationTick + 1,
      sectionRevisions: Object.fromEntries([
        ...body.sections.map((section) => [section.id, 1] as const),
        ...retainedArchived.map(
          (section) =>
            [
              section.id,
              result.state.sectionRevisions?.[section.id] ?? 1,
            ] as const
        ),
      ]),
    };

    await persistCreedState(supabase, user.id, nextState);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import Strap from GitHub.";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 400 }
    );
  }
}
