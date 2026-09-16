import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(secret = process.env.STRAP_VAULT_SECRET) {
  if (!secret || secret.length < 32) throw new Error("STRAP_VAULT_SECRET must contain at least 32 characters.");
  return createHash("sha256").update(secret).digest();
}
export function encryptVaultSecret(value: string, itemId: string, profileId: string, secret?: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(`strap:vault:v1:${profileId}:${itemId}`));
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}
export function decryptVaultSecret(value: string, itemId: string, profileId: string, secret?: string) {
  const [version, iv, tag, body, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || body === undefined || extra !== undefined) throw new Error("Stored Vault secret is malformed.");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(`strap:vault:v1:${profileId}:${itemId}`));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}
