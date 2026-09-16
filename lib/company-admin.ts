import * as tables from "@/db/schema/application";
import { recordAuditEvent } from "@/lib/audit-log";
import type { User } from "@/lib/auth/user";
import { authorizeValues } from "@/lib/authz/policies";
import type { DatabaseContext } from "@/lib/db/context";
import { callProcedure } from "@/lib/db/procedures";
import { conflictSet, query } from "@/lib/db/query";
import { serviceContext } from "@/lib/db/service";
import { checkLegacyDeletion } from "@/lib/legacy-subscription-deletion";
import { encryptSecret, hashSecret } from "@/lib/secret-crypto";
import type { AgentPermission } from "@/lib/strap-data";
import { getStrapRole } from "@/lib/strap-membership";
import { getDisplayName } from "@/lib/user-name";
import { and, eq, inArray } from "drizzle-orm";
import "server-only";

// Owner/admin management operations for a Company Strap: roles, member removal,
// per-section permissions, rename, ownership transfer, delete, and BYOK. All run
// on the service-role admin client after an app-level role check, and record an
// audit row + (where member-visible) an activity row.

export type AdminResult =
  { ok: true } | { ok: false; error: string; status: number };

function admin(): DatabaseContext {
  return serviceContext("lib/company-admin.ts");
}

function actorName(user: User): string {
  return getDisplayName(user, "Someone");
}

async function activity(
  creedId: string,
  user: User,
  summary: string,
  eventKind: string,
): Promise<void> {
  const db = admin();
  const { randomBytes } = await import("node:crypto");
  await query(db, tables.creed_activity, "insert", async (database, _scope) => {
    const values = {
    id: randomBytes(16).toString("hex"),
    creed_id: creedId,
    user_id: user.id,
    actor_user_id: user.id,
    actor: actorName(user),
    actor_type: "user",
    summary,
    status: "direct",
    event_kind: eventKind,
  } as typeof tables.creed_activity.$inferInsert;
    await authorizeValues(db, tables.creed_activity, "insert", values);
    return database.insert(tables.creed_activity).values(values);
  });
}

/**
 * Change a member's role between admin and member. Owner-only: an admin cannot
 * promote a member to admin or demote another admin - only the owner sets roles.
 * The owner's own role is never changed here (transfer ownership instead).
 */
export async function setMemberRole(params: {
  creedId: string;
  actor: User;
  targetUserId: string;
  role: "admin" | "member";
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner") {
    return {
      ok: false,
      error: "Only the owner can change roles.",
      status: 403,
    };
  }
  const targetRole = await getStrapRole(
    db,
    params.targetUserId,
    params.creedId,
  );
  if (targetRole === "owner") {
    return {
      ok: false,
      error: "The owner's role cannot be changed here.",
      status: 400,
    };
  }
  const { error } = await query(db, tables.creed_members, "update", async (database, scope) => {
    const values = { role: params.role } as Partial<typeof tables.creed_members.$inferInsert>;
    await authorizeValues(db, tables.creed_members, "update", values);
    return database.update(tables.creed_members).set(values).where(and(scope, eq(tables.creed_members.creed_id, params.creedId), eq(tables.creed_members.user_id, params.targetUserId)));
  });
  if (error)
    return { ok: false, error: "Could not change the role.", status: 500 };
  await recordAuditEvent({
    userId: params.actor.id,
    action: "company.role_changed",
    metadata: {
      creedId: params.creedId,
      targetUserId: params.targetUserId,
      role: params.role,
    },
  });
  await activity(
    params.creedId,
    params.actor,
    `${actorName(params.actor)} changed a member's role to ${params.role}`,
    "role",
  );
  return { ok: true };
}

/**
 * Remove a member. Owner/admin only. An admin can remove members but NOT another
 * admin (only the owner manages admins); the owner can remove anyone but
 * themselves (transfer ownership first). Clears the removed member's overrides +
 * MCP grants.
 */
export async function removeMember(params: {
  creedId: string;
  actor: User;
  targetUserId: string;
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner" && actorRole !== "admin") {
    return {
      ok: false,
      error: "Only an owner or admin can remove members.",
      status: 403,
    };
  }
  const targetRole = await getStrapRole(
    db,
    params.targetUserId,
    params.creedId,
  );
  if (targetRole === "owner") {
    return {
      ok: false,
      error: "The owner cannot be removed. Transfer ownership first.",
      status: 400,
    };
  }
  if (!targetRole)
    return { ok: false, error: "That person is not a member.", status: 404 };
  if (targetRole === "admin" && actorRole !== "owner") {
    return {
      ok: false,
      error: "Only the owner can remove an admin.",
      status: 403,
    };
  }

  const { error: removeError } = await query(db, tables.creed_members, "delete", (database, scope) => database.delete(tables.creed_members).where(and(scope, eq(tables.creed_members.creed_id, params.creedId), eq(tables.creed_members.user_id, params.targetUserId))));
  if (removeError) {
    return { ok: false, error: "Could not remove the member.", status: 500 };
  }
  await query(db, tables.creed_member_section_permissions, "delete", (database, scope) => database.delete(tables.creed_member_section_permissions).where(and(scope, eq(tables.creed_member_section_permissions.creed_id, params.creedId), eq(tables.creed_member_section_permissions.user_id, params.targetUserId))));
  // Revoke the removed member's MCP grants for this Strap (their token rows stay;
  // only the per-Strap grant is dropped).
  const { data: tokens } = (await query(db, tables.oauth_tokens, "select", (database, scope) => database.select({ id: tables.oauth_tokens.id }).from(tables.oauth_tokens).where(and(scope, eq(tables.oauth_tokens.user_id, params.targetUserId))))) as {
    data: Array<{ id: string }> | null;
  };
  if (tokens && tokens.length > 0) {
    await query(db, tables.oauth_token_creeds, "delete", (database, scope) => database.delete(tables.oauth_token_creeds).where(and(scope, eq(tables.oauth_token_creeds.creed_id, params.creedId), inArray(tables.oauth_token_creeds.token_id, tokens.map((t) => t.id)))));
  }
  await recordAuditEvent({
    userId: params.actor.id,
    action: "company.member_removed",
    metadata: { creedId: params.creedId, targetUserId: params.targetUserId },
  });
  await activity(
    params.creedId,
    params.actor,
    `${actorName(params.actor)} removed a member`,
    "membership",
  );
  return { ok: true };
}

/** Set (or clear, when permission is the default) a member's per-section permission. */
export async function setSectionPermission(params: {
  creedId: string;
  actor: User;
  targetUserId: string;
  sectionId: string;
  permission: AgentPermission;
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner" && actorRole !== "admin") {
    return {
      ok: false,
      error: "Only an owner or admin can change permissions.",
      status: 403,
    };
  }
  // Do not let a permission be set on an owner/admin (they are always direct).
  const targetRole = await getStrapRole(
    db,
    params.targetUserId,
    params.creedId,
  );
  if (targetRole !== "member") {
    return {
      ok: false,
      error: "Permissions only apply to members.",
      status: 400,
    };
  }
  const { error } = await query(db, tables.creed_member_section_permissions, "insert", async (database, scope) => {
    const values = {
      creed_id: params.creedId,
      user_id: params.targetUserId,
      section_id: params.sectionId,
      permission: params.permission,
      updated_by: params.actor.id,
      updated_at: new Date().toISOString(),
    } as typeof tables.creed_member_section_permissions.$inferInsert;
    await authorizeValues(db, tables.creed_member_section_permissions, "insert", values);
    return database.insert(tables.creed_member_section_permissions).values(values).onConflictDoUpdate({ target: [tables.creed_member_section_permissions.creed_id, tables.creed_member_section_permissions.user_id, tables.creed_member_section_permissions.section_id], set: conflictSet(tables.creed_member_section_permissions, values), setWhere: scope });
  });
  if (error)
    return {
      ok: false,
      error: "Could not change the permission.",
      status: 500,
    };
  // Recorded in the audit log only - access changes are deliberately NOT shown
  // in the activity sidebar, which is reserved for content edits / proposals.
  await recordAuditEvent({
    userId: params.actor.id,
    action: "company.permission_changed",
    metadata: {
      creedId: params.creedId,
      targetUserId: params.targetUserId,
      sectionId: params.sectionId,
      permission: params.permission,
    },
  });
  return { ok: true };
}

/** Rename the Company Strap (owner/admin). */
// Update the company's General settings: its name and/or its shared contact
// email (owner/admin). Each field is optional so the settings screen can save
// them independently on blur. Passing email as "" clears it.
export async function updateCompanyGeneral(params: {
  creedId: string;
  actor: User;
  name?: string;
  email?: string;
  avatarUrl?: string;
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner" && actorRole !== "admin") {
    return {
      ok: false,
      error: "Only an owner or admin can update company settings.",
      status: 403,
    };
  }
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.name !== undefined) {
    const name = params.name.trim();
    if (!name) return { ok: false, error: "Name is required.", status: 400 };
    patch.name = name;
  }
  if (params.email !== undefined) {
    const email = params.email.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { ok: false, error: "Enter a valid email.", status: 400 };
    }
    patch.company_email = email || null;
  }
  if (params.avatarUrl !== undefined) {
    const avatarUrl = params.avatarUrl.trim();
    if (!avatarUrl) {
      return { ok: false, error: "Avatar URL is required.", status: 400 };
    }
    patch.avatar_url = avatarUrl;
  }
  const { error } = await query(db, tables.creeds, "update", async (database, scope) => {
    const values = patch as Partial<typeof tables.creeds.$inferInsert>;
    await authorizeValues(db, tables.creeds, "update", values);
    return database.update(tables.creeds).set(values).where(and(scope, eq(tables.creeds.id, params.creedId)));
  });
  if (error) {
    return { ok: false, error: "Could not update company settings.", status: 500 };
  }
  return { ok: true };
}

/**
 * Transfer ownership to another member. The old owner becomes admin, the target
 * becomes owner, and both owner_user_id columns (creeds + creed_company_billing)
 * follow. Owner-only. Frozen billing does NOT block this: an owner must be able
 * to hand off a lapsed company so the new owner can fix billing.
 */
export async function transferOwnership(params: {
  creedId: string;
  actor: User;
  targetUserId: string;
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner") {
    return { ok: false, error: "Only the owner can transfer ownership.", status: 403 };
  }
  if (params.targetUserId === params.actor.id) {
    return { ok: false, error: "You already own this company.", status: 400 };
  }
  const targetRole = await getStrapRole(db, params.targetUserId, params.creedId);
  if (!targetRole) {
    return { ok: false, error: "That person is not a member.", status: 404 };
  }

  // All four writes (both membership roles + both owner_user_id columns) move in
  // one transaction via the RPC, so a partial failure can't leave creed_members
  // and creeds.owner_user_id disagreeing with no safe retry. The RPC demotes
  // before promoting to satisfy the one-owner-per-creed index.
  const rpc = serviceContext("lib/company-admin.ts");
  const { error: transferError } = await callProcedure(rpc, "transfer_creed_ownership", {
    p_creed_id: params.creedId,
    p_from: params.actor.id,
    p_to: params.targetUserId,
  });
  if (transferError) {
    return { ok: false, error: "Could not transfer ownership.", status: 500 };
  }

  await recordAuditEvent({
    userId: params.actor.id,
    action: "company.ownership_transferred",
    metadata: { creedId: params.creedId, from: params.actor.id, to: params.targetUserId },
  });
  await activity(
    params.creedId,
    params.actor,
    `${actorName(params.actor)} transferred ownership`,
    "ownership",
  );
  return { ok: true };
}

/** Delete the Company Strap (owner-only). Cascades all content via FKs. */
export async function deleteCompany(params: {
  creedId: string;
  actor: User;
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner") {
    return {
      ok: false,
      error: "Only the owner can delete the company Strap.",
      status: 403,
    };
  }
  const blocker = await checkLegacyDeletion(db, { scope: "company", strapId: params.creedId });
  if (blocker) return { ok: false, ...blocker };
  await recordAuditEvent({
    userId: params.actor.id,
    action: "company.deleted",
    metadata: { creedId: params.creedId },
  });
  const { error } = await query(db, tables.creeds, "delete", (database, scope) => database.delete(tables.creeds).where(and(scope, eq(tables.creeds.id, params.creedId))));
  if (error) {
    return { ok: false, error: "Could not delete the company Strap.", status: 500 };
  }
  return { ok: true };
}

/** Set or clear the company BYOK OpenRouter key (owner-only, encrypted at rest). */
export async function setCompanyByok(params: {
  creedId: string;
  actor: User;
  key: string | null;
  mode?: "credits" | "byok";
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner") {
    return { ok: false, error: "Only the owner can manage BYOK.", status: 403 };
  }
  const row: Record<string, unknown> = {
    creed_id: params.creedId,
    updated_by: params.actor.id,
    updated_at: new Date().toISOString(),
  };
  if (params.key === null || params.key.trim() === "") {
    row.encrypted_openrouter_key = null;
    row.openrouter_key_hash = null;
    row.api_key_last_four = null;
    row.key_status = "missing";
    row.ai_mode = params.mode ?? "credits";
  } else {
    const key = params.key.trim();
    row.encrypted_openrouter_key = encryptSecret(key);
    row.openrouter_key_hash = hashSecret(key);
    row.api_key_last_four = key.slice(-4);
    row.key_status = "present";
    row.ai_mode = params.mode ?? "byok";
  }
  const { error } = await query(db, tables.creed_company_ai_settings, "insert", async (database, scope) => {
    const values = row as typeof tables.creed_company_ai_settings.$inferInsert;
    await authorizeValues(db, tables.creed_company_ai_settings, "insert", values);
    return database.insert(tables.creed_company_ai_settings).values(values).onConflictDoUpdate({ target: [tables.creed_company_ai_settings.creed_id], set: conflictSet(tables.creed_company_ai_settings, values), setWhere: scope });
  });
  if (error)
    return { ok: false, error: "Could not update BYOK settings.", status: 500 };
  await recordAuditEvent({
    userId: params.actor.id,
    action: "company.byok_updated",
    metadata: { creedId: params.creedId, cleared: params.key === null },
  });
  await activity(
    params.creedId,
    params.actor,
    `${actorName(params.actor)} updated the company BYOK settings`,
    "byok",
  );
  return { ok: true };
}

/**
 * Switch the company between credits and BYOK without touching the stored key
 * (owner-only). A partial upsert leaves encrypted_openrouter_key / key_status
 * intact, so toggling back to BYOK does not require re-entering the key - exactly
 * how the personal mode toggle behaves.
 */
export async function setCompanyAiMode(params: {
  creedId: string;
  actor: User;
  mode: "credits" | "byok";
}): Promise<AdminResult> {
  const db = admin();
  const actorRole = await getStrapRole(db, params.actor.id, params.creedId);
  if (actorRole !== "owner") {
    return {
      ok: false,
      error: "Only the owner can manage AI billing.",
      status: 403,
    };
  }
  const { error } = await query(db, tables.creed_company_ai_settings, "insert", async (database, scope) => {
    const values = {
        creed_id: params.creedId,
        ai_mode: params.mode,
        updated_by: params.actor.id,
        updated_at: new Date().toISOString(),
      } as typeof tables.creed_company_ai_settings.$inferInsert;
    await authorizeValues(db, tables.creed_company_ai_settings, "insert", values);
    return database.insert(tables.creed_company_ai_settings).values(values).onConflictDoUpdate({ target: [tables.creed_company_ai_settings.creed_id], set: conflictSet(tables.creed_company_ai_settings, values), setWhere: scope });
  });
  if (error)
    return { ok: false, error: "Could not update AI settings.", status: 500 };
  await recordAuditEvent({
    userId: params.actor.id,
    action: "company.ai_mode_updated",
    metadata: { creedId: params.creedId, mode: params.mode },
  });
  return { ok: true };
}
