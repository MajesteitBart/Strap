import { createHash, randomBytes } from "node:crypto";

export const HEADLESS_KEY_PREFIX = "creed_key_";
export const HEADLESS_KEY_MODES = ["read-only", "proposal-only", "direct"] as const;
export type HeadlessKeyMode = (typeof HEADLESS_KEY_MODES)[number];

export function isHeadlessKeyMode(value: unknown): value is HeadlessKeyMode {
  return typeof value === "string" && HEADLESS_KEY_MODES.includes(value as HeadlessKeyMode);
}

export function createHeadlessKey(): { key: string; prefix: string; hash: string } {
  const key = `${HEADLESS_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    key,
    prefix: key.slice(0, HEADLESS_KEY_PREFIX.length + 8),
    hash: digestCredential(key),
  };
}

export function isHeadlessKey(value: string): boolean {
  return value.startsWith(HEADLESS_KEY_PREFIX) && value.length > HEADLESS_KEY_PREFIX.length + 30;
}

export function digestCredential(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseOptionalExpiry(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) return undefined;
  const max = Date.now() + 366 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() > max) return undefined;
  return parsed.toISOString();
}
