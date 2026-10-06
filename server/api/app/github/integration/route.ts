import { requireApiAuth } from "@/lib/api-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { getGitHubViewer } from "@/lib/github";
import { clearGitHubIntegration, upsertGitHubIntegration } from "@/lib/strap-backend";

type PersistBody = {
  providerToken?: string;
  providerRefreshToken?: string | null;
  tokenExpiresAt?: string | null;
};

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  try {
    const { context, user } = auth;
    const body = (await request.json()) as PersistBody;
    const providerToken = body.providerToken?.trim();

    if (!providerToken || providerToken.length > 500) {
      return Response.json({ error: "Missing GitHub provider token." }, { status: 400 });
    }

    const viewer = await getGitHubViewer(providerToken);
    if (!viewer) {
      return Response.json({ error: "Could not validate GitHub token." }, { status: 400 });
    }

    // Identity is derived from the verified token only - never from the request body.
    await upsertGitHubIntegration(context, user.id, {
      status: "connected",
      providerAccountId: String(viewer.id),
      providerLogin: viewer.login,
      accessToken: providerToken,
      refreshToken: body.providerRefreshToken?.trim() || null,
      tokenExpiresAt: body.tokenExpiresAt?.trim() || null,
    });

    void recordAuditEvent({
      userId: user.id,
      action: "github.connected",
      request,
      metadata: { providerLogin: viewer.login, providerAccountId: String(viewer.id) },
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not persist GitHub integration.";
    return Response.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) return auth;
  try {
    const { context, user } = auth;
    await clearGitHubIntegration(context, user.id);
    void recordAuditEvent({
      userId: user.id,
      action: "github.disconnected",
      request,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not disconnect GitHub.";
    return Response.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 400 }
    );
  }
}
