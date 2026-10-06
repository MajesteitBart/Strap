import type { User } from "./auth/user";
import type { DatabaseContext } from "./db/context";
import { getRequestAuth } from "./request-auth";

export type AuthContext = { context: DatabaseContext; user: User };
export async function requireApiAuth(): Promise<AuthContext | Response> {
  const auth = await getRequestAuth();
  return auth.user ? { context: auth.context, user: auth.user } : Response.json({ error: "Unauthorized" }, { status: 401 });
}
