import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AccessDeniedError, type Viewer } from "../authz/viewer.ts";

export type DatabaseContext = Readonly<{
  database: PostgresJsDatabase;
  actor: { kind: "viewer"; viewer: Viewer } | { kind: "service"; purpose: string } | { kind: "anonymous" };
}>;

export function viewerContext(database: PostgresJsDatabase, viewer: Viewer): DatabaseContext {
  if (!viewer.userId) throw new AccessDeniedError();
  return { database, actor: { kind: "viewer", viewer } };
}

export function requireService(context: DatabaseContext) {
  if (context.actor.kind !== "service" || !context.actor.purpose) throw new AccessDeniedError();
}
