import { resolveRootEntry, resolveSignInEntry } from "@/lib/entry-gates";
import { createServerFn } from "@tanstack/react-start";

type SignInInput = { next?: string; requireConfigured?: boolean };

export const getRootEntry = createServerFn({ method: "GET" }).handler(() => resolveRootEntry());

export const getSignInEntry = createServerFn({ method: "GET" })
  .validator((input: SignInInput) => ({
    next: typeof input?.next === "string" ? input.next : undefined,
    requireConfigured: input?.requireConfigured === true,
  }))
  .handler(({ data }) => resolveSignInEntry(data.next, { requireConfigured: data.requireConfigured }));
