import * as tables from "@/db/schema/application";
import type { User } from "@/lib/auth/user";
import { authorizeValues } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { exactlyOne, maybeOne, query } from "@/lib/db/query";
import { findUser } from "@/lib/db/repositories/users";
import { serviceContext } from "@/lib/db/service";
import { hashSecret } from "@/lib/secret-crypto";
import { getAvatarInitials, getAvatarUrl, getUserName } from "@/lib/strap-backend";
import { getStrapRole } from "@/lib/strap-membership";
import { and, eq, lt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import "server-only";

export type InviterProfile = { name: string; avatarUrl?: string; initials: string };

// Company invites: create / accept / resend / revoke.
//
// Invites expire after 7 days, carry a hashed token (the raw token only ever
// lives in the emailed link), and are unique-per-email-per-Strap while pending.
// All writes go through the admin client after an app-level owner/admin role
// check in the calling route.

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InviteResult =
  | { ok: true; inviteId: string; token: string }
  | {
      ok: false;
      error: string;
      code: "forbidden" | "duplicate" | "already_member" | "failed";
    };

export type AcceptResult =
  | { ok: true; creedId: string }
  | { ok: false; error: string; code: "invalid" | "expired" | "email_mismatch" | "failed" };

function admin(): DatabaseContext {
  return serviceContext("lib/company-invites.ts");
}

async function isCompanyCreed(db: DatabaseContext, creedId: string): Promise<boolean> {
  const { data, error } = (await query(db, tables.creeds, "select", (database, scope) => database.select({ type: tables.creeds.type }).from(tables.creeds).where(and(scope, eq(tables.creeds.id, creedId)))).then(maybeOne)) as { data: { type: string } | null; error: unknown };
  return !error && data?.type === "company";
}

/**
 * Flip pending invites past their expiry to `expired`. Lazy sweep (single
 * indexed UPDATE, idempotent): called before creating an invite so the
 * one-pending-invite-per-email uniqueness never trips on a dead invite.
 * Cheaper than a cron for the volume here.
 */
export async function sweepExpiredInvites(creedId: string): Promise<void> {
  const db = admin();
  await query(db, tables.creed_invites, "update", async (database, scope) => {
    const values = { status: "expired", updated_at: new Date().toISOString() } as Partial<typeof tables.creed_invites.$inferInsert>;
    await authorizeValues(db, tables.creed_invites, "update", values);
    return database.update(tables.creed_invites).set(values).where(and(scope, eq(tables.creed_invites.creed_id, creedId), eq(tables.creed_invites.status, "pending"), lt(tables.creed_invites.expires_at, new Date().toISOString())));
  });
}

/**
 * True if the email already belongs to a member of this Strap. Fails CLOSED:
 * if any auth lookup errors we can't rule out a match, so we throw rather than
 * return false - the caller reports a retryable error instead of letting an
 * invite to an existing member through (which would consume a seat that can
 * never be used up).
 */
async function emailBelongsToMember(creedId: string, normalizedEmail: string): Promise<boolean> {
  const db = admin();
  const { data: members } = (await query(db, tables.creed_members, "select", (database, scope) => database.select({ user_id: tables.creed_members.user_id }).from(tables.creed_members).where(and(scope, eq(tables.creed_members.creed_id, creedId))))) as { data: Array<{ user_id: string }> | null };
  if (!members || members.length === 0) return false;
  const authAdmin = serviceContext("lib/company-invites.ts");
  // No per-call catch: a thrown or returned error propagates so the caller fails
  // closed instead of treating an unknown member as "not a match".
  const users = await Promise.all(
    members.map((m) => findUser(authAdmin, m.user_id))
  );
  if (users.some((r) => r.error)) {
    throw new Error("Could not verify existing members.");
  }
  return users.some(
    (r) => (r.data?.user?.email ?? "").trim().toLowerCase() === normalizedEmail
  );
}

/**
 * Create a pending invite. The caller must be owner/admin (checked here against
 * live membership). Enforces one pending invite per email. Returns the raw
 * token so the route can build + send the email link. Does not send email
 * itself (kept side-effect free for testing).
 */
export async function createInvite(params: {
  creedId: string;
  actorUserId: string;
  email: string;
  role: "admin" | "member";
}): Promise<InviteResult> {
  const { creedId, actorUserId, email, role } = params;
  const db = admin();

  const actorRole = await getStrapRole(db, actorUserId, creedId);
  if (actorRole !== "owner" && actorRole !== "admin") {
    return { ok: false, error: "Only an owner or admin can invite.", code: "forbidden" };
  }
  if (!(await isCompanyCreed(db, creedId))) {
    return { ok: false, error: "Invites are only available for company Straps.", code: "forbidden" };
  }

  // Expire dead invites first so the one-pending-invite-per-email uniqueness
  // below never trips on an invite that already lapsed.
  await sweepExpiredInvites(creedId);

  const normalizedEmail = email.trim().toLowerCase();

  // Inviting someone already on the team would consume a seat forever (accept
  // is idempotent for existing members, so the invite can never be "used up").
  // Reject cleanly before touching a seat. If the membership check can't
  // complete, fail closed with a retryable error rather than risk the invite.
  let alreadyMember: boolean;
  try {
    alreadyMember = await emailBelongsToMember(creedId, normalizedEmail);
  } catch {
    return { ok: false, error: "Could not verify members. Please try again.", code: "failed" };
  }
  if (alreadyMember) {
    return { ok: false, error: "That person is already a member.", code: "already_member" };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSecret(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data, error } = (await query(db, tables.creed_invites, "insert", async (database, _scope) => {
    const values = {
      creed_id: creedId,
      email: normalizedEmail,
      role,
      token_hash: tokenHash,
      invited_by: actorUserId,
      status: "pending",
      expires_at: expiresAt,
    } as typeof tables.creed_invites.$inferInsert;
    await authorizeValues(db, tables.creed_invites, "insert", values);
    return database.insert(tables.creed_invites).values(values).returning({ id: tables.creed_invites.id });
  }).then(exactlyOne)) as { data: { id: string } | null; error: { message?: string; code?: string } | null };

  if (error || !data) {
    // Unique violation on the partial index = a pending invite already exists.
    if (error?.code === "23505") {
      return { ok: false, error: "That email already has a pending invite.", code: "duplicate" };
    }
    return { ok: false, error: "Could not create the invite.", code: "failed" };
  }

  return { ok: true, inviteId: data.id, token };
}

/** Revoke a pending invite (owner/admin), freeing its seat. */
export async function revokeInvite(params: {
  creedId: string;
  actorUserId: string;
  inviteId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actorUserId, params.creedId);
  if (actorRole !== "owner" && actorRole !== "admin") {
    return { ok: false, error: "Only an owner or admin can revoke invites." };
  }
  const { error } = await query(db, tables.creed_invites, "update", async (database, scope) => {
    const values = { status: "revoked", updated_at: new Date().toISOString() } as Partial<typeof tables.creed_invites.$inferInsert>;
    await authorizeValues(db, tables.creed_invites, "update", values);
    return database.update(tables.creed_invites).set(values).where(and(scope, eq(tables.creed_invites.id, params.inviteId), eq(tables.creed_invites.creed_id, params.creedId), eq(tables.creed_invites.status, "pending")));
  });
  return error ? { ok: false, error: "Could not revoke the invite." } : { ok: true };
}

/**
 * Rotate a pending invite's token (resend). Returns the fresh raw token + email
 * for the route to re-send. Extends the expiry another 7 days.
 */
export async function rotateInviteToken(params: {
  creedId: string;
  actorUserId: string;
  inviteId: string;
}): Promise<{ ok: true; token: string; email: string; role: "admin" | "member" } | { ok: false; error: string }> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actorUserId, params.creedId);
  if (actorRole !== "owner" && actorRole !== "admin") {
    return { ok: false, error: "Only an owner or admin can resend invites." };
  }
  const token = randomBytes(32).toString("base64url");
  const { data, error } = (await query(db, tables.creed_invites, "update", async (database, scope) => {
    const values = {
      token_hash: hashSecret(token),
      expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      updated_at: new Date().toISOString(),
    } as Partial<typeof tables.creed_invites.$inferInsert>;
    await authorizeValues(db, tables.creed_invites, "update", values);
    return database.update(tables.creed_invites).set(values).where(and(scope, eq(tables.creed_invites.id, params.inviteId), eq(tables.creed_invites.creed_id, params.creedId), eq(tables.creed_invites.status, "pending"))).returning({ email: tables.creed_invites.email, role: tables.creed_invites.role });
  }).then(exactlyOne)) as { data: { email: string; role: "admin" | "member" } | null; error: unknown };
  if (error || !data) return { ok: false, error: "Could not resend the invite." };
  return { ok: true, token, email: data.email, role: data.role };
}

type InviteRow = {
  id: string;
  creed_id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  expires_at: string;
  invited_by: string | null;
};

/** Display profile for the invite's sender, for the accept screen's avatars. */
async function resolveInviterProfile(userId: string | null): Promise<InviterProfile | null> {
  if (!userId) return null;
  const { data } = await findUser(serviceContext("resolve invite sender")
    , userId)
    .catch(() => ({ data: { user: null } }));
  const user = data?.user ?? null;
  if (!user) return null;
  const name = getUserName(user);
  return { name, avatarUrl: getAvatarUrl(user), initials: getAvatarInitials(name) };
}

/**
 * Resolve an invite by its raw token (server-only), for the accept page.
 * `expired` is computed here (a plain async function) so the page's server
 * component render stays pure and never calls Date.now() itself.
 */
export async function resolveInviteByToken(
  token: string
): Promise<{ invite: InviteRow; companyName: string; expired: boolean; inviter: InviterProfile | null } | null> {
  const db = admin();
  const { data } = (await query(db, tables.creed_invites, "select", (database, scope) => database.select({ id: tables.creed_invites.id, creed_id: tables.creed_invites.creed_id, email: tables.creed_invites.email, role: tables.creed_invites.role, status: tables.creed_invites.status, expires_at: tables.creed_invites.expires_at, invited_by: tables.creed_invites.invited_by }).from(tables.creed_invites).where(and(scope, eq(tables.creed_invites.token_hash, hashSecret(token))))).then(maybeOne)) as { data: InviteRow | null };
  if (!data) return null;
  const [{ data: creed }, inviter] = await Promise.all([
    query(db, tables.creeds, "select", (database, scope) => database.select({ name: tables.creeds.name, type: tables.creeds.type }).from(tables.creeds).where(and(scope, eq(tables.creeds.id, data.creed_id)))).then(maybeOne) as Promise<{
      data: { name: string; type: string } | null;
    }>,
    resolveInviterProfile(data.invited_by),
  ]);
  if (creed?.type !== "company") return null;
  return {
    invite: data,
    companyName: creed?.name ?? "the company",
    expired: Date.parse(data.expires_at) < Date.now(),
    inviter,
  };
}

/**
 * Accept an invite for the signed-in user. Re-validates status, expiry, and
 * that the invite's email matches the user's (case-insensitive). Creates the
 * membership and marks the invite accepted. Idempotent: an already-member
 * returns ok.
 */
export async function acceptInvite(token: string, user: User): Promise<AcceptResult> {
  const db = admin();
  const resolved = await resolveInviteByToken(token);
  if (!resolved) return { ok: false, error: "This invite link is not valid.", code: "invalid" };

  const { invite, companyName } = resolved;
  void companyName;

  if (invite.status !== "pending") {
    return { ok: false, error: "This invite is no longer active.", code: "invalid" };
  }
  if (Date.parse(invite.expires_at) < Date.now()) {
    await query(db, tables.creed_invites, "update", async (database, scope) => {
    const values = { status: "expired" } as Partial<typeof tables.creed_invites.$inferInsert>;
    await authorizeValues(db, tables.creed_invites, "update", values);
    return database.update(tables.creed_invites).set(values).where(and(scope, eq(tables.creed_invites.id, invite.id)));
  });
    return { ok: false, error: "This invite has expired. Ask for a new one.", code: "expired" };
  }
  const userEmail = user.email?.trim().toLowerCase() ?? "";
  if (userEmail !== invite.email.trim().toLowerCase()) {
    return {
      ok: false,
      error: `This invite was sent to ${invite.email}. Sign in with that email.`,
      code: "email_mismatch",
    };
  }

  // Already a member? Accept idempotently.
  const existingRole = await getStrapRole(db, user.id, invite.creed_id);
  if (existingRole) {
    await query(db, tables.creed_invites, "update", async (database, scope) => {
    const values = { status: "accepted", updated_at: new Date().toISOString() } as Partial<typeof tables.creed_invites.$inferInsert>;
    await authorizeValues(db, tables.creed_invites, "update", values);
    return database.update(tables.creed_invites).set(values).where(and(scope, eq(tables.creed_invites.id, invite.id)));
  });
    return { ok: true, creedId: invite.creed_id };
  }

  const { error: memberError } = await query(db, tables.creed_members, "insert", async (database, _scope) => {
    const values = {
    creed_id: invite.creed_id,
    user_id: user.id,
    role: invite.role,
  } as typeof tables.creed_members.$inferInsert;
    await authorizeValues(db, tables.creed_members, "insert", values);
    return database.insert(tables.creed_members).values(values);
  });
  if (memberError) {
    return { ok: false, error: "Could not join the company.", code: "failed" };
  }

  await query(db, tables.creed_invites, "update", async (database, scope) => {
    const values = { status: "accepted", updated_at: new Date().toISOString() } as Partial<typeof tables.creed_invites.$inferInsert>;
    await authorizeValues(db, tables.creed_invites, "update", values);
    return database.update(tables.creed_invites).set(values).where(and(scope, eq(tables.creed_invites.id, invite.id)));
  });

  return { ok: true, creedId: invite.creed_id };
}

/**
 * Decline an invite for the signed-in user. Validates the invite is pending and
 * addressed to the user's email, then marks it `declined` (freeing the seat -
 * only `pending` invites count toward capacity). A distinct status from an
 * owner-side `revoked` so the audit trail can tell a user-decline from an
 * admin-revoke. Idempotent: a non-pending invite for the right email returns ok.
 */
export async function declineInvite(token: string, user: User): Promise<{ ok: boolean; error?: string }> {
  const db = admin();
  const resolved = await resolveInviteByToken(token);
  if (!resolved) return { ok: false, error: "This invite link is not valid." };

  const { invite } = resolved;
  const userEmail = user.email?.trim().toLowerCase() ?? "";
  if (userEmail !== invite.email.trim().toLowerCase()) {
    return { ok: false, error: `This invite was sent to ${invite.email}.` };
  }
  if (invite.status !== "pending") return { ok: true };

  const { error } = await query(db, tables.creed_invites, "update", async (database, scope) => {
    const values = { status: "declined", updated_at: new Date().toISOString() } as Partial<typeof tables.creed_invites.$inferInsert>;
    await authorizeValues(db, tables.creed_invites, "update", values);
    return database.update(tables.creed_invites).set(values).where(and(scope, eq(tables.creed_invites.id, invite.id), eq(tables.creed_invites.status, "pending")));
  });
  return error ? { ok: false, error: "Could not decline the invite." } : { ok: true };
}

export type { InviteRow };
