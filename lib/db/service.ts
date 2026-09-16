import "server-only";
import { getDatabase } from "./client";
import type { DatabaseContext } from "./context";

// Internal jobs and domain operations use this only after their explicit
// credential, membership or role guard. Browser requests receive viewerContext.
export function serviceContext(purpose: string): DatabaseContext {
  if (!purpose.trim()) throw new Error("A service operation must state its purpose.");
  return { database: getDatabase(), actor: { kind: "service", purpose } };
}
