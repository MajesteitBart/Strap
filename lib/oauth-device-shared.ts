import { randomBytes } from "node:crypto";
import type { HeadlessKeyMode } from "@/lib/headless-access-shared";

export const DEVICE_USER_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const DEVICE_USER_CODE_LENGTH = 8;

export function createDeviceUserCode(): string {
  let value = "";
  while (value.length < DEVICE_USER_CODE_LENGTH) {
    const bytes = randomBytes(DEVICE_USER_CODE_LENGTH - value.length);
    for (const byte of bytes) {
      const unbiasedLimit = Math.floor(256 / DEVICE_USER_CODE_ALPHABET.length) * DEVICE_USER_CODE_ALPHABET.length;
      if (byte >= unbiasedLimit) continue;
      value += DEVICE_USER_CODE_ALPHABET[byte % DEVICE_USER_CODE_ALPHABET.length];
      if (value.length === DEVICE_USER_CODE_LENGTH) break;
    }
  }
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}

export function normalizeDeviceUserCode(value: string): string | null {
  const normalized = value.toUpperCase().replace(/[\s-]/g, "");
  if (normalized.length !== DEVICE_USER_CODE_LENGTH) return null;
  for (const character of normalized) {
    if (!DEVICE_USER_CODE_ALPHABET.includes(character)) return null;
  }
  return normalized;
}

export function normalizeOAuthScope(value: string): string {
  const allowed = new Set(["read", "propose", "direct_edit"]);
  const requested = value.trim().split(/\s+/).filter((scope) => allowed.has(scope));
  return [...new Set(requested.length ? requested : ["read", "propose"])].join(" ");
}

const DEVICE_GRANT_MODES: HeadlessKeyMode[] = ["read-only", "proposal-only", "direct"];

export function deviceGrantModesForScope(scope: string): HeadlessKeyMode[] {
  const requested = new Set(normalizeOAuthScope(scope).split(" "));
  const maximum = requested.has("direct_edit")
    ? "direct"
    : requested.has("propose")
      ? "proposal-only"
      : "read-only";
  return DEVICE_GRANT_MODES.slice(0, DEVICE_GRANT_MODES.indexOf(maximum) + 1);
}

export function capDeviceGrantMode(
  mode: HeadlessKeyMode,
  scope: string,
): HeadlessKeyMode {
  const allowed = deviceGrantModesForScope(scope);
  return allowed.includes(mode) ? mode : allowed[allowed.length - 1];
}
