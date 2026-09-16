import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { encryptVaultSecret } from "../vault-crypto.ts";

// The source allowlist is intentionally fixed. Auth sessions, refresh tokens,
// provider-owned schemas and retired billing functions are not imported.
export const applicationTables = [
  "creeds", "creed_members", "creed_sections", "creed_proposals", "creed_activity",
  "creed_ai_settings", "creed_ai_usage", "creed_audit_log", "creed_company_ai_settings",
  "creed_company_billing", "creed_company_github_integration", "creed_company_version_control",
  "creed_connections", "creed_credit_transactions", "creed_credits", "creed_entitlements",
  "creed_getting_started", "creed_headless_access_keys", "creed_integrations", "creed_invites",
  "creed_mcp_clients", "creed_mcp_read_events", "creed_member_agent_permissions",
  "creed_member_section_permissions", "creed_quality_reports", "creed_seat_purchases",
  "creed_section_versions", "creed_tokens", "creed_vault_items", "creed_version_control",
  "oauth_clients", "oauth_authorization_codes", "oauth_device_authorizations", "oauth_tokens",
  "oauth_token_creeds", "strap_skills", "strap_skill_versions",
] as const;
type Row = Record<string, unknown>;
export type MigrationSnapshot = { users: Row[]; accounts: Row[]; tables: Record<string, Row[]> };
const identifier = (name: string) => {
  if (!/^[a-z_][a-z_0-9]*$/.test(name)) throw new Error("Invalid schema identifier.");
  return `"${name}"`;
};
function object(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function importedAvatar(value: unknown): string | null {
  const url = text(value);
  if (!url) return null;
  try { if (new URL(url).hostname.endsWith(".supabase.co")) return null; } catch { return null; }
  return url;
}

export function transformUsers(sourceUsers: Row[], identities: Row[]): Pick<MigrationSnapshot, "users" | "accounts"> {
  const accounts: Row[] = [];
  const users = sourceUsers.map(source => {
    const metadata = object(source.raw_user_meta_data);
    const email = text(source.email).trim().toLowerCase();
    if (!email || !source.id) throw new Error("Every imported user must have an id and email.");
    const created = source.created_at ?? new Date().toISOString();
    const updated = source.updated_at ?? created;
    if (text(source.encrypted_password)) accounts.push({ id: randomUUID(), user_id: source.id, provider_id: "credential", account_id: source.id, password: source.encrypted_password, created_at: created, updated_at: updated });
    return { id: source.id, email, email_verified: Boolean(source.email_confirmed_at), name: text(metadata.full_name) || text(metadata.name) || email.split("@")[0], display_name: text(metadata.display_name) || null,
      image: importedAvatar(metadata.picture) || importedAvatar(metadata.avatar_url), avatar_url: importedAvatar(metadata.avatar_url), created_at: created, updated_at: updated };
  });
  if (new Set(users.map(user=>user.email)).size !== users.length) throw new Error("Imported email addresses are not unique after normalization.");
  for (const identity of identities) {
    if (identity.provider === "email") continue;
    const metadata = object(identity.identity_data);
    const provider = identity.provider === "x" ? "twitter" : text(identity.provider);
    const accountId = text(metadata.sub) || text(identity.provider_id) || text(metadata.id);
    if (!provider || !accountId) throw new Error("A provider identity is missing its subject.");
    if (!users.some(user=>user.id === identity.user_id)) throw new Error("Identity references an unexported user.");
    accounts.push({ id: randomUUID(), user_id: identity.user_id, provider_id: provider, account_id: accountId, created_at: identity.created_at ?? new Date().toISOString(), updated_at: identity.updated_at ?? identity.created_at ?? new Date().toISOString() });
  }
  return { users, accounts };
}

export async function exportSource(source: Sql): Promise<MigrationSnapshot> {
  return source.begin("isolation level repeatable read read only", async tx => {
    const inventory = await tx<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`;
    if (inventory.length !== applicationTables.length || inventory.some(row => !(applicationTables as readonly string[]).includes(row.table_name))) throw new Error("Source table inventory changed; review before exporting.");
    const [objects] = await tx<{ count: number }[]>`select count(*)::int as count from storage.objects`;
    if (objects.count !== 0) throw new Error("Source storage is no longer empty; migrate its objects before cutover.");
    const sourceUsers = await tx<Row[]>`select id,email,encrypted_password,raw_user_meta_data,email_confirmed_at,created_at,updated_at from auth.users`;
    const identities = await tx<Row[]>`select user_id,provider,provider_id,identity_data,created_at,updated_at from auth.identities`;
    const snapshot: MigrationSnapshot = { ...transformUsers(sourceUsers, identities), tables: {} };
    for (const table of applicationTables) {
      const exactColumns = await tx<{ column_name: string }[]>`select column_name from information_schema.columns where table_schema='public' and table_name=${table} and data_type in ('bigint','numeric')`;
      const overrides = exactColumns.length ? ` || jsonb_build_object(${exactColumns.map(c=>`'${c.column_name}', t.${identifier(c.column_name)}::text`).join(",")})` : "";
      const rows = await tx.unsafe<{ row: Row }[]>(`select to_jsonb(t)${overrides} as row from public.${identifier(table)} t`);
      snapshot.tables[table] = rows.map(result=>result.row);
    }
    for (const profile of snapshot.tables.creeds) profile.avatar_url = importedAvatar(profile.avatar_url);
    for (const row of snapshot.tables.creed_vault_items) {
      const [secret] = await tx<{ decrypted_secret: string }[]>`select decrypted_secret from vault.decrypted_secrets where id=${text(row.vault_secret_id)}`;
      if (!secret) throw new Error("A Vault item could not be exported.");
      row.secret_ciphertext = encryptVaultSecret(secret.decrypted_secret, text(row.id), text(row.creed_id));
      delete row.vault_secret_id;
    }
    return snapshot;
  });
}

async function insertRows(tx: TransactionSql, table: string, rows: Row[]) {
  if (!rows.length) return;
  const columns = await tx<{ column_name: string; is_generated: string }[]>`select column_name,is_generated from information_schema.columns where table_schema='public' and table_name=${table} order by ordinal_position`;
  const known = new Set(columns.map(column => column.column_name));
  if (rows.some(row => Object.keys(row).some(key => !known.has(key)))) throw new Error(`Source columns changed: ${table}.`);
  const supplied = columns.filter(c => c.is_generated === "NEVER").map(c=>c.column_name).filter(column=>rows.some(row=>column in row));
  const names = supplied.map(identifier).join(", ");
  // Bind serialized JSON as text so pooled connections cannot infer jsonb and
  // serialize the string a second time after describing the statement.
  await tx.unsafe(`insert into public.${identifier(table)} (${names}) overriding system value select ${names} from jsonb_populate_recordset(null::public.${identifier(table)}, $1::text::jsonb)`, [JSON.stringify(rows)]);
}

export async function importSnapshot(target: Sql, snapshot: MigrationSnapshot): Promise<Record<string, number>> {
  const expected = new Set<string>(applicationTables);
  if (Object.keys(snapshot.tables).some(table=>!expected.has(table)) || applicationTables.some(table=>!snapshot.tables[table])) throw new Error("Source inventory does not match the import allowlist.");
  return target.begin(async tx => {
    await tx`select pg_advisory_xact_lock(hashtextextended('strap:source-import',0))`;
    const allTables = ["users", "accounts", "sessions", "verifications", "auth_rate_limits", "user_avatars", "creed_avatars", ...applicationTables];
    for (const table of allTables) {
      const [row] = await tx.unsafe<{ present: boolean }[]>(`select exists(select 1 from public.${identifier(table)}) as present`);
      if (row.present) throw new Error(`Destination must be empty: ${table}.`);
    }
    const dependencies = await tx<{ child: string; parent: string }[]>`select child.relname as child, parent.relname as parent from pg_constraint fk join pg_class child on child.oid=fk.conrelid join pg_class parent on parent.oid=fk.confrelid where fk.contype='f' and child.relnamespace='public'::regnamespace and parent.relnamespace='public'::regnamespace`;
    await insertRows(tx, "users", snapshot.users);
    await insertRows(tx, "accounts", snapshot.accounts);
    const inserted = new Set(["users", "accounts"]);
    const remaining = new Set<string>(applicationTables);
    while (remaining.size) {
      const ready = [...remaining].filter(table=>dependencies.every(fk=>fk.child !== table || fk.parent === table || inserted.has(fk.parent)));
      if (!ready.length) throw new Error("The import dependency graph contains a cycle.");
      for (const table of ready) {
        await insertRows(tx, table, snapshot.tables[table]);
        inserted.add(table); remaining.delete(table);
      }
    }
    const counts: Record<string, number> = {};
    for (const table of inserted) {
      const [row] = await tx.unsafe<{ count: number }[]>(`select count(*)::int as count from public.${identifier(table)}`);
      const expectedCount = table === "users" ? snapshot.users.length : table === "accounts" ? snapshot.accounts.length : snapshot.tables[table].length;
      if (row.count !== expectedCount) throw new Error(`Row-count mismatch: ${table}.`);
      counts[table] = row.count;
    }
    const identities = await tx<{ table_name: string; column_name: string }[]>`select table_name,column_name from information_schema.columns where table_schema='public' and is_identity='YES'`;
    for (const column of identities) {
      await tx.unsafe(`select setval(pg_get_serial_sequence('public.${identifier(column.table_name)}', $1), greatest(coalesce((select max(${identifier(column.column_name)}) from public.${identifier(column.table_name)}), 1), 1), exists(select 1 from public.${identifier(column.table_name)}))`, [column.column_name]);
    }
    return counts;
  });
}
