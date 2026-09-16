import { createHash, timingSafeEqual } from "node:crypto";
export function authorizeMaintenance(authorization: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(authorization.slice(7)), hash(secret));
}
