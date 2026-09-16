import { NextResponse } from "next/server";
import type { User } from "./auth/user";
import type { DatabaseContext } from "./db/context";
import { getRequestAuth } from "./request-auth";

export type AuthContext = { context: DatabaseContext; user: User };
export async function requireApiAuth(): Promise<AuthContext | NextResponse> {
  const auth = await getRequestAuth();
  return auth.user ? { context: auth.context, user: auth.user } : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
