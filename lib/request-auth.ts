import { headers } from "next/headers";
import { cache } from "react";
import "server-only";
import { getAuthServer } from "./auth/server";
import type { User } from "./auth/user";
import { getDatabase } from "./db/client";
import { viewerContext, type DatabaseContext } from "./db/context";

// Resolve once per render; database lookups immediately enforce revocation.
export const getRequestAuth = cache(async (): Promise<{ context: DatabaseContext; user: User | null }> => {
  const session = await getAuthServer().api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  const database = getDatabase();
  return {
    context: session ? viewerContext(database, { userId: session.user.id }) : { database, actor: { kind: "anonymous" } },
    user: session?.user ?? null,
  };
});

export async function getRequestDatabaseContext() {
  return (await getRequestAuth()).context;
}
