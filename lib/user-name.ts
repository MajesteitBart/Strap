import type { User } from "@/lib/auth/user";

// A user-selected displayName wins over the provider name after sign-in.
export function getDisplayName(user: User, fallback = "You"): string {
  return user.displayName?.trim() || user.name?.trim() || user.email?.split("@")[0] || fallback;
}
