// Callers derive the viewer from a verified session or resolved agent credential.
export type Viewer = Readonly<{ userId: string }>;

export class AccessDeniedError extends Error {
  readonly status = 403;
  constructor() {
    super("Access denied.");
    this.name = "AccessDeniedError";
  }
}

export function requireOwnUser(viewer: Viewer, userId: string) {
  if (!viewer.userId || viewer.userId !== userId) throw new AccessDeniedError();
}
