import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createHash } from "node:crypto";
import { creed_members, creeds } from "../../../db/schema/application.ts";
import { users } from "../../../db/schema/auth.ts";
import { creed_avatars, user_avatars } from "../../../db/schema/avatars.ts";
import { AccessDeniedError, type Viewer } from "../../authz/viewer.ts";

export type AvatarKind = "personal" | "company";
export function validImage(body: Buffer, contentType: string) {
  if (!body.length || body.length > 3 * 1024 * 1024) return false;
  if (contentType === "image/png") return body.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (contentType === "image/jpeg") return body[0] === 255 && body[1] === 216 && body[2] === 255;
  if (contentType === "image/gif") return ["GIF87a", "GIF89a"].includes(body.subarray(0, 6).toString("ascii"));
  return contentType === "image/webp" && body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function saveAvatar(db: PostgresJsDatabase, viewer: Viewer, kind: AvatarKind, id: string, body: Buffer, contentType: string) {
  if (!validImage(body, contentType)) throw new Error("Invalid image.");
  const hash = createHash("sha256").update(body).digest("hex");
  const url = `/api/avatars/${kind}/${id}?v=${hash}`;
  await db.transaction(async tx => {
    if (kind === "personal") {
      if (id !== viewer.userId) throw new AccessDeniedError();
      await tx.insert(user_avatars).values({ user_id: id, body, content_type: contentType, hash })
        .onConflictDoUpdate({ target: user_avatars.user_id, set: { body, content_type: contentType, hash, updated_at: new Date().toISOString() } });
      await tx.update(users).set({ avatarUrl: url, updatedAt: new Date() }).where(eq(users.id, viewer.userId));
    } else {
      const [membership] = await tx.select({ role: creed_members.role, type: creeds.type }).from(creed_members)
        .innerJoin(creeds, eq(creeds.id, creed_members.creed_id))
        .where(and(eq(creed_members.creed_id, id), eq(creed_members.user_id, viewer.userId))).for("share");
      if (membership?.type !== "company" || !["owner", "admin"].includes(membership.role)) throw new AccessDeniedError();
      await tx.insert(creed_avatars).values({ creed_id: id, body, content_type: contentType, hash })
        .onConflictDoUpdate({ target: creed_avatars.creed_id, set: { body, content_type: contentType, hash, updated_at: new Date().toISOString() } });
      await tx.update(creeds).set({ avatar_url: url, updated_at: new Date().toISOString() }).where(eq(creeds.id, id));
    }
  });
  return url;
}

// Avatars were public objects. The route exposes only the image bytes.
export async function readAvatar(db: PostgresJsDatabase, kind: AvatarKind, id: string) {
  const table = kind === "personal" ? user_avatars : creed_avatars;
  const column = kind === "personal" ? user_avatars.user_id : creed_avatars.creed_id;
  const [row] = await db.select({ body: table.body, contentType: table.content_type, hash: table.hash }).from(table).where(eq(column, id)).limit(1);
  return row ?? null;
}
