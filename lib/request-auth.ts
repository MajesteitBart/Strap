import { cache } from "react";
import "server-only";
import { currentRequestHeaders } from "./http/request-context";
import { getAuthServer } from "./auth/server";
import type { User } from "./auth/user";
import { getDatabase } from "./db/client";
import { viewerContext, type DatabaseContext } from "./db/context";

// Database lookups immediately enforce revocation. Callers resolve the session
// once per request (cache() only dedupes inside React Server Components).
export const getRequestAuth = cache(async (): Promise<{ context: DatabaseContext; user: User | null }> => {
  const session = await getAuthServer().api.getSession({ headers: currentRequestHeaders(), query: { disableCookieCache: true } });
  const database = getDatabase();
  return {
    context: session ? viewerContext(database, { userId: session.user.id }) : { database, actor: { kind: "anonymous" } },
    user: session?.user ?? null,
  };
});

export async function getRequestDatabaseContext() {
  return (await getRequestAuth()).context;
}
