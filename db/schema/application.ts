// Application schema preserves the existing SQL identifiers and constraints.
import { pgTable, uuid, index, foreignKey, check, text, integer, numeric, timestamp, bigint, jsonb, unique, boolean, uniqueIndex, primaryKey, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



import { users } from "./auth.ts";

export const creed_ai_usage = pgTable("creed_ai_usage", {
  id: text().primaryKey().notNull(),
  user_id: uuid().notNull(),
  feature: text().notNull(),
  provider: text().default('openrouter').notNull(),
  model_id: text().notNull(),
  model_quality: text().notNull(),
  input_tokens: integer().default(0).notNull(),
  output_tokens: integer().default(0).notNull(),
  estimated_cost_usd: numeric({ precision: 12, scale: 6 }).default(sql`0`).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  ai_mode: text().default('byok').notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  charged_micro_usd: bigint({ mode: "number" }),
  creed_id: uuid(),
}, (table) => [
  index("creed_ai_usage_creed_created_idx").using("btree", table.creed_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  index("creed_ai_usage_user_created_idx").using("btree", table.user_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_ai_usage_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_ai_usage_user_id_fkey"
    }).onDelete("cascade"),
  check("creed_ai_usage_ai_mode_check", sql`ai_mode = ANY (ARRAY['credits'::text, 'byok'::text])`),
]);

export const creed_audit_log = pgTable("creed_audit_log", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  user_id: uuid(),
  action: text().notNull(),
  metadata: jsonb().default({}).notNull(),
  ip_address: text(),
  user_agent: text(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  creed_id: uuid(),
}, (table) => [
  index("creed_audit_log_action_created_at_idx").using("btree", table.action.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  index("creed_audit_log_creed_created_idx").using("btree", table.creed_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  index("creed_audit_log_user_id_created_at_idx").using("btree", table.user_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_audit_log_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_audit_log_user_id_fkey"
    }).onDelete("cascade"),
]);

export const creed_company_ai_settings = pgTable("creed_company_ai_settings", {
  creed_id: uuid().primaryKey().notNull(),
  ai_mode: text().default('credits').notNull(),
  encrypted_openrouter_key: text(),
  openrouter_key_hash: text(),
  api_key_last_four: text(),
  key_status: text().default('missing').notNull(),
  updated_by: uuid(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_company_ai_settings_creed_id_fkey"
    }).onDelete("cascade"),
  check("creed_company_ai_settings_ai_mode_check", sql`ai_mode = ANY (ARRAY['credits'::text, 'byok'::text])`),
]);

export const creed_company_billing = pgTable("creed_company_billing", {
  creed_id: uuid().primaryKey().notNull(),
  owner_user_id: uuid().notNull(),
  stripe_customer_id: text(),
  stripe_session_id: text(),
  stripe_subscription_id: text(),
  billing_mode: text().notNull(),
  billing_interval: text(),
  status: text().notNull(),
  current_period_end: timestamp({ withTimezone: true, mode: 'string' }),
  cancel_at_period_end: boolean().default(false).notNull(),
  seats_included: integer().default(10).notNull(),
  extra_seats: integer().default(0).notNull(),
  amount_cents: integer(),
  currency: text().default('usd'),
  paid_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  stripe_payment_intent_id: text(),
  welcomed_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
  index("creed_company_billing_payment_intent_idx").using("btree", table.stripe_payment_intent_id.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_company_billing_creed_id_fkey"
    }).onDelete("cascade"),
  unique("creed_company_billing_stripe_session_id_key").on(table.stripe_session_id),
  check("creed_company_billing_billing_interval_check", sql`billing_interval = ANY (ARRAY['month'::text, 'year'::text])`),
  check("creed_company_billing_billing_mode_check", sql`billing_mode = ANY (ARRAY['subscription'::text, 'lifetime'::text])`),
  check("creed_company_billing_status_check", sql`status = ANY (ARRAY['paid'::text, 'refunded'::text, 'active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text])`),
]);

export const creed_company_github_integration = pgTable("creed_company_github_integration", {
  creed_id: uuid().primaryKey().notNull(),
  provider: text().default('github').notNull(),
  status: text().default('not-connected').notNull(),
  provider_account_id: text(),
  provider_login: text(),
  encrypted_access_token: text(),
  encrypted_refresh_token: text(),
  token_expires_at: timestamp({ withTimezone: true, mode: 'string' }),
  connected_by: uuid(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_company_github_integration_creed_id_fkey"
    }).onDelete("cascade"),
  check("creed_company_github_integration_status_check", sql`status = ANY (ARRAY['connected'::text, 'not-connected'::text, 'disconnected'::text])`),
]);

export const creed_company_version_control = pgTable("creed_company_version_control", {
  creed_id: uuid().primaryKey().notNull(),
  provider: text().default('github').notNull(),
  configured_by: uuid(),
  repo_owner: text(),
  repo_name: text(),
  branch: text(),
  path: text().default('strap.md').notNull(),
  last_remote_sha: text(),
  last_remote_message: text(),
  last_remote_committed_at: timestamp({ withTimezone: true, mode: 'string' }),
  last_synced_content_hash: text(),
  sync_status: text().default('not-configured').notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_company_version_control_creed_id_fkey"
    }).onDelete("cascade"),
]);

export const creed_credit_transactions = pgTable("creed_credit_transactions", {
  id: text().primaryKey().notNull(),
  user_id: uuid(),
  type: text().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  amount_micro_usd: bigint({ mode: "number" }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  balance_after_micro_usd: bigint({ mode: "number" }).notNull(),
  feature: text(),
  model_id: text(),
  stripe_payment_intent_id: text(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  bucket: text(),
  grant_period_key: text(),
  creed_id: uuid().notNull(),
  spent_by_user_id: uuid(),
}, (table) => [
  index("creed_credit_transactions_creed_created_idx").using("btree", table.creed_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  uniqueIndex("creed_credit_transactions_grant_period_idx").using("btree", table.user_id.asc().nullsLast(), table.grant_period_key.asc().nullsLast()).where(sql`(type = 'grant'::text)`),
  index("creed_credit_transactions_user_created_idx").using("btree", table.user_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_credit_transactions_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_credit_transactions_user_id_fkey"
    }).onDelete("cascade"),
  unique("creed_credit_transactions_stripe_payment_intent_id_key").on(table.stripe_payment_intent_id),
  check("creed_credit_transactions_amount_micro_usd_check", sql`amount_micro_usd >= 0`),
  check("creed_credit_transactions_bucket_check", sql`(bucket IS NULL) OR (bucket = ANY (ARRAY['granted'::text, 'purchased'::text, 'mixed'::text]))`),
  check("creed_credit_transactions_check", sql`(type <> 'topup'::text) OR (stripe_payment_intent_id IS NOT NULL)`),
  check("creed_credit_transactions_type_check", sql`type = ANY (ARRAY['topup'::text, 'debit'::text, 'grant'::text])`),
]);

export const creed_entitlements = pgTable("creed_entitlements", {
  user_id: uuid().primaryKey().notNull(),
  email: text().notNull(),
  stripe_customer_id: text(),
  stripe_session_id: text().notNull(),
  stripe_payment_intent_id: text(),
  stripe_price_id: text().notNull(),
  amount_cents: integer().notNull(),
  currency: text().default('usd').notNull(),
  status: text().default('paid').notNull(),
  paid_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  plan: text().default('personal').notNull(),
  billing_mode: text().default('lifetime').notNull(),
  stripe_subscription_id: text(),
  current_period_end: timestamp({ withTimezone: true, mode: 'string' }),
  cancel_at_period_end: boolean().default(false).notNull(),
  billing_interval: text(),
  welcomed_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
  index("creed_entitlements_customer_id_idx").using("btree", table.stripe_customer_id.asc().nullsLast()).where(sql`(stripe_customer_id IS NOT NULL)`),
  uniqueIndex("creed_entitlements_subscription_id_key").using("btree", table.stripe_subscription_id.asc().nullsLast()).where(sql`(stripe_subscription_id IS NOT NULL)`),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_entitlements_user_id_fkey"
    }).onDelete("cascade"),
  unique("creed_entitlements_stripe_session_id_key").on(table.stripe_session_id),
  check("creed_entitlements_billing_interval_check", sql`(billing_interval IS NULL) OR (billing_interval = ANY (ARRAY['month'::text, 'year'::text]))`),
  check("creed_entitlements_billing_mode_check", sql`billing_mode = ANY (ARRAY['subscription'::text, 'lifetime'::text])`),
  check("creed_entitlements_plan_check", sql`plan = ANY (ARRAY['personal'::text, 'company'::text])`),
  check("creed_entitlements_status_check", sql`status = ANY (ARRAY['paid'::text, 'refunded'::text, 'active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text])`),
]);

export const creed_credits = pgTable("creed_credits", {
  user_id: uuid(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  balance_micro_usd: bigint({ mode: "number" }).default(0).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  granted_micro_usd: bigint({ mode: "number" }).default(0).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  purchased_micro_usd: bigint({ mode: "number" }).default(0).notNull(),
  grant_period_key: text(),
  grant_period_start: timestamp({ withTimezone: true, mode: 'string' }),
  creed_id: uuid().primaryKey().notNull(),
}, (table) => [
  index("creed_credits_user_id_idx").using("btree", table.user_id.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_credits_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_credits_user_id_fkey"
    }).onDelete("cascade"),
]);

export const strap_skills = pgTable("strap_skills", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  strap_id: uuid().notNull(),
  name: text().notNull(),
  description: text().notNull(),
  revision: integer().notNull(),
  digest: text().notNull(),
  files: jsonb().notNull(),
  byte_count: integer().notNull(),
  archived: boolean().default(false).notNull(),
  updated_by: uuid(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  file_count: integer().generatedAlwaysAs(sql`jsonb_array_length(files)`),
  storage_bytes: integer().generatedAlwaysAs(sql`octet_length((files)::text)`),
}, (table) => [
  index("strap_skills_updated_by_idx").using("btree", table.updated_by.asc().nullsLast()),
  foreignKey({
      columns: [table.strap_id],
      foreignColumns: [creeds.id],
      name: "strap_skills_strap_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.updated_by],
      foreignColumns: [users.id],
      name: "strap_skills_updated_by_fkey"
    }).onDelete("set null"),
  unique("strap_skills_strap_id_name_key").on(table.strap_id, table.name),
  check("strap_skills_byte_count_check", sql`(byte_count >= 1) AND (byte_count <= 2097152)`),
  check("strap_skills_description_check", sql`(length(description) >= 1) AND (length(description) <= 1024)`),
  check("strap_skills_digest_check", sql`digest ~ '^[a-f0-9]{64}$'::text`),
  check("strap_skills_files_check", sql`(jsonb_typeof(files) = 'array'::text) AND ((jsonb_array_length(files) >= 1) AND (jsonb_array_length(files) <= 128)) AND (octet_length((files)::text) <= 12582912)`),
  check("strap_skills_name_check", sql`(length(name) >= 1) AND (length(name) <= 64) AND (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)`),
  check("strap_skills_revision_check", sql`revision > 0`),
]);

export const creed_activity = pgTable("creed_activity", {
  id: text().primaryKey().notNull(),
  user_id: uuid().notNull(),
  proposal_id: text(),
  section_id: text(),
  section_name: text(),
  accent: text(),
  actor: text().notNull(),
  actor_type: text().notNull(),
  summary: text().notNull(),
  status: text().notNull(),
  change_type: text(),
  reason: text(),
  impact: text(),
  confidence: text(),
  before_text: text(),
  after_text: text(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_id: uuid().notNull(),
  actor_user_id: uuid(),
  event_kind: text().default('edit').notNull(),
}, (table) => [
  index("creed_activity_created_idx").using("btree", table.created_at.asc().nullsLast()),
  index("creed_activity_creed_created_idx").using("btree", table.creed_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  index("creed_activity_proposal_id_idx").using("btree", table.proposal_id.asc().nullsLast()),
  index("creed_activity_user_created_idx").using("btree", table.user_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_activity_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.proposal_id],
      foreignColumns: [creed_proposals.id],
      name: "creed_activity_proposal_id_fkey"
    }).onDelete("set null"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_activity_user_id_fkey"
    }).onDelete("cascade"),
  check("creed_activity_event_kind_check", sql`event_kind = ANY (ARRAY['edit'::text, 'proposal'::text, 'membership'::text, 'role'::text, 'permission'::text, 'billing'::text, 'usage'::text, 'byok'::text, 'ownership'::text, 'section-trash'::text, 'restore'::text])`),
]);

export const creed_ai_settings = pgTable("creed_ai_settings", {
  user_id: uuid().primaryKey().notNull(),
  provider: text().default('openrouter').notNull(),
  selected_model_id: text(),
  encrypted_api_key: text(),
  api_key_last_four: text(),
  key_status: text().default('missing').notNull(),
  last_validated_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  ai_mode: text().default('credits').notNull(),
}, (table) => [
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_ai_settings_user_id_fkey"
    }).onDelete("cascade"),
  check("creed_ai_settings_ai_mode_check", sql`ai_mode = ANY (ARRAY['credits'::text, 'byok'::text])`),
]);

export const creed_getting_started = pgTable("creed_getting_started", {
  user_id: uuid().primaryKey().notNull(),
  steps: jsonb().default({}).notNull(),
  completed_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_getting_started_user_id_fkey"
    }).onDelete("cascade"),
]);

export const creed_invites = pgTable("creed_invites", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  creed_id: uuid().notNull(),
  email: text().notNull(),
  role: text().default('member').notNull(),
  token_hash: text().notNull(),
  invited_by: uuid().notNull(),
  status: text().default('pending').notNull(),
  expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  index("creed_invites_creed_idx").using("btree", table.creed_id.asc().nullsLast()),
  uniqueIndex("creed_invites_one_pending_per_email").using("btree", sql`creed_id`, sql`lower(email)`).where(sql`(status = 'pending'::text)`),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_invites_creed_id_fkey"
    }).onDelete("cascade"),
  unique("creed_invites_token_hash_key").on(table.token_hash),
  check("creed_invites_role_check", sql`role = ANY (ARRAY['admin'::text, 'member'::text])`),
  check("creed_invites_status_check", sql`status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text, 'declined'::text])`),
]);

export const creed_seat_purchases = pgTable("creed_seat_purchases", {
  stripe_session_id: text().primaryKey().notNull(),
  creed_id: uuid().notNull(),
  seats: integer().notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  index("creed_seat_purchases_creed_id_idx").using("btree", table.creed_id.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_seat_purchases_creed_id_fkey"
    }).onDelete("cascade"),
  check("creed_seat_purchases_seats_check", sql`seats > 0`),
]);

export const creed_quality_reports = pgTable("creed_quality_reports", {
  section_hashes: jsonb(),
  user_id: uuid().notNull(),
  content_hash: text().notNull(),
  model_id: text().notNull(),
  report: jsonb().default({}).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_id: uuid().primaryKey().notNull(),
}, (table) => [
  index("creed_quality_reports_creed_hash_idx").using("btree", table.creed_id.asc().nullsLast(), table.content_hash.asc().nullsLast()),
  index("creed_quality_reports_user_hash_idx").using("btree", table.user_id.asc().nullsLast(), table.content_hash.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_quality_reports_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_quality_reports_user_id_fkey"
    }).onDelete("cascade"),
]);

export const creed_section_versions = pgTable("creed_section_versions", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "creed_section_versions_id_seq", startWith: 1, increment: 1, minValue: 1, cache: 1 }),
  creed_id: uuid().notNull(),
  section_id: text().notNull(),
  revision: integer().notNull(),
  name: text().notNull(),
  accent: text().notNull(),
  content: text().notNull(),
  actor_user_id: uuid(),
  actor_type: text().notNull(),
  agent_name: text(),
  cause: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  index("creed_section_versions_lookup_idx").using("btree", table.creed_id.asc().nullsLast(), table.section_id.asc().nullsLast(), table.id.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_section_versions_creed_id_fkey"
    }).onDelete("cascade"),
  check("creed_section_versions_actor_type_check", sql`actor_type = ANY (ARRAY['user'::text, 'agent'::text])`),
  check("creed_section_versions_cause_check", sql`cause = ANY (ARRAY['manual'::text, 'mcp'::text, 'proposal'::text, 'restore'::text, 'import'::text, 'onboarding'::text])`),
]);

export const creed_tokens = pgTable("creed_tokens", {
  user_id: uuid().primaryKey().notNull(),
  read_token: text(),
  proposal_token: text(),
  require_approval: boolean().default(true).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  read_token_hash: text(),
  proposal_token_hash: text(),
  direct_edit_token: text(),
  direct_edit_token_hash: text(),
  encrypted_read_token: text(),
  encrypted_proposal_token: text(),
  encrypted_direct_edit_token: text(),
}, (table) => [
  uniqueIndex("creed_tokens_direct_edit_token_hash_idx").using("btree", table.direct_edit_token_hash.asc().nullsLast()).where(sql`(direct_edit_token_hash IS NOT NULL)`),
  uniqueIndex("creed_tokens_proposal_token_hash_idx").using("btree", table.proposal_token_hash.asc().nullsLast()).where(sql`(proposal_token_hash IS NOT NULL)`),
  uniqueIndex("creed_tokens_read_token_hash_idx").using("btree", table.read_token_hash.asc().nullsLast()).where(sql`(read_token_hash IS NOT NULL)`),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_tokens_user_id_fkey"
    }).onDelete("cascade"),
]);

export const creed_proposals = pgTable("creed_proposals", {
  id: text().primaryKey().notNull(),
  user_id: uuid().notNull(),
  section_id: text().notNull(),
  section_name: text().notNull(),
  accent: text().notNull(),
  agent_name: text().notNull(),
  change_type: text().notNull(),
  reason: text().notNull(),
  impact: text().notNull(),
  confidence: text().notNull(),
  draft: jsonb().default({}).notNull(),
  status: text().default('pending').notNull(),
  base_revision: integer(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_id: uuid().notNull(),
  author_user_id: uuid(),
}, (table) => [
  index("creed_proposals_creed_created_idx").using("btree", table.creed_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  index("creed_proposals_creed_status_idx").using("btree", table.creed_id.asc().nullsLast(), table.status.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_proposals_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_proposals_user_id_fkey"
    }).onDelete("cascade"),
]);

export const creed_headless_access_keys = pgTable("creed_headless_access_keys", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  creed_id: uuid().notNull(),
  user_id: uuid().notNull(),
  name: text().notNull(),
  key_prefix: text().notNull(),
  key_hash: text().notNull(),
  vault_item_ids: uuid().array().default(sql`'{}'::uuid[]`).notNull(),
  mode: text().default('proposal-only').notNull(),
  expires_at: timestamp({ withTimezone: true, mode: 'string' }),
  revoked_at: timestamp({ withTimezone: true, mode: 'string' }),
  last_used_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  check("creed_headless_access_keys_vault_item_ids_check", sql`cardinality(${table.vault_item_ids}) <= 100 AND array_position(${table.vault_item_ids}, NULL) IS NULL`),
  uniqueIndex("creed_headless_access_keys_hash_idx").using("btree", table.key_hash.asc().nullsLast()),
  index("creed_headless_access_keys_user_creed_idx").using("btree", table.user_id.asc().nullsLast(), table.creed_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_headless_access_keys_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_headless_access_keys_user_id_fkey"
    }).onDelete("cascade"),
  check("creed_headless_access_keys_key_prefix_check", sql`(char_length(key_prefix) >= 8) AND (char_length(key_prefix) <= 32)`),
  check("creed_headless_access_keys_mode_check", sql`mode = ANY (ARRAY['read-only'::text, 'proposal-only'::text, 'direct'::text])`),
  check("creed_headless_access_keys_name_check", sql`(char_length(name) >= 1) AND (char_length(name) <= 120)`),
]);

export const creed_version_control = pgTable("creed_version_control", {
  user_id: uuid().primaryKey().notNull(),
  provider: text().default('github').notNull(),
  repo_owner: text(),
  repo_name: text(),
  branch: text(),
  path: text().default('strap.md').notNull(),
  last_remote_sha: text(),
  last_remote_message: text(),
  last_remote_committed_at: timestamp({ withTimezone: true, mode: 'string' }),
  last_synced_content_hash: text(),
  sync_status: text().default('not-configured').notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_version_control_user_id_fkey"
    }).onDelete("cascade"),
]);

export const oauth_authorization_codes = pgTable("oauth_authorization_codes", {
  code_hash: text().primaryKey().notNull(),
  client_id: text().notNull(),
  user_id: uuid().notNull(),
  redirect_uri: text().notNull(),
  code_challenge: text().notNull(),
  scope: text().default('read propose').notNull(),
  expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  used_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_grants: jsonb(),
}, (table) => [
  index("oauth_authorization_codes_user_idx").using("btree", table.user_id.asc().nullsLast()),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "oauth_authorization_codes_user_id_fkey"
    }).onDelete("cascade"),
]);

export const creed_vault_items = pgTable("creed_vault_items", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  creed_id: uuid().notNull(),
  secret_ciphertext: text().notNull(),
  name: text().notNull(),
  description: text().default('').notNull(),
  created_by: uuid().notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  last_accessed_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
  index("creed_vault_items_creed_created_idx").using("btree", table.creed_id.asc().nullsLast(), table.created_at.desc().nullsFirst()),
  uniqueIndex("creed_vault_items_name_idx").using("btree", sql`creed_id`, sql`lower(name)`),
  foreignKey({
      columns: [table.created_by],
      foreignColumns: [users.id],
      name: "creed_vault_items_created_by_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_vault_items_creed_id_fkey"
    }).onDelete("cascade"),
  check("creed_vault_items_description_check", sql`char_length(description) <= 500`),
  check("creed_vault_items_name_check", sql`(char_length(name) >= 1) AND (char_length(name) <= 120)`),
]);

export const oauth_clients = pgTable("oauth_clients", {
  client_id: text().primaryKey().notNull(),
  client_name: text().default('MCP Client').notNull(),
  redirect_uris: text().array().default(sql`'{}'::text[]`).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
});

export const oauth_tokens = pgTable("oauth_tokens", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  access_token_hash: text().notNull(),
  refresh_token_hash: text().notNull(),
  encrypted_access_token: text().notNull(),
  encrypted_refresh_token: text().notNull(),
  client_id: text().notNull(),
  user_id: uuid().notNull(),
  scope: text().default('read propose').notNull(),
  access_expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  refresh_expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  revoked_at: timestamp({ withTimezone: true, mode: 'string' }),
  last_used_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_grants_explicit: boolean().default(false).notNull(),
}, (table) => [
  uniqueIndex("oauth_tokens_access_hash_idx").using("btree", table.access_token_hash.asc().nullsLast()),
  uniqueIndex("oauth_tokens_refresh_hash_idx").using("btree", table.refresh_token_hash.asc().nullsLast()),
  index("oauth_tokens_user_client_idx").using("btree", table.user_id.asc().nullsLast(), table.client_id.asc().nullsLast()),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "oauth_tokens_user_id_fkey"
    }).onDelete("cascade"),
]);

export const creeds = pgTable("creeds", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  type: text().notNull(),
  name: text().notNull(),
  owner_user_id: uuid().notNull(),
  onboarding_stage: text(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  company_email: text(),
  avatar_url: text(),
}, (table) => [
  uniqueIndex("creeds_one_company_per_owner").using("btree", table.owner_user_id.asc().nullsLast()).where(sql`(type = 'company'::text)`),
  uniqueIndex("creeds_one_personal_per_owner").using("btree", table.owner_user_id.asc().nullsLast()).where(sql`(type = 'personal'::text)`),
  index("creeds_owner_idx").using("btree", table.owner_user_id.asc().nullsLast()),
  foreignKey({
      columns: [table.owner_user_id],
      foreignColumns: [users.id],
      name: "creeds_owner_user_id_fkey"
    }).onDelete("cascade"),
  check("creeds_type_check", sql`type = ANY (ARRAY['personal'::text, 'company'::text])`),
]);

export const oauth_device_authorizations = pgTable("oauth_device_authorizations", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  device_code_hash: text().notNull(),
  user_code_hash: text().notNull(),
  client_id: text().notNull(),
  scope: text().default('read propose').notNull(),
  status: text().default('pending').notNull(),
  user_id: uuid(),
  creed_id: uuid(),
  mode: text(),
  verification_attempts: integer().default(0).notNull(),
  interval_seconds: integer().default(5).notNull(),
  next_poll_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  expires_at: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  approved_at: timestamp({ withTimezone: true, mode: 'string' }),
  consumed_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  uniqueIndex("oauth_device_authorizations_device_hash_idx").using("btree", table.device_code_hash.asc().nullsLast()),
  index("oauth_device_authorizations_expiry_idx").using("btree", table.expires_at.asc().nullsLast()).where(sql`(status = ANY (ARRAY['pending'::text, 'approved'::text]))`),
  uniqueIndex("oauth_device_authorizations_user_hash_idx").using("btree", table.user_code_hash.asc().nullsLast()).where(sql`(status = 'pending'::text)`),
  foreignKey({
      columns: [table.client_id],
      foreignColumns: [oauth_clients.client_id],
      name: "oauth_device_authorizations_client_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "oauth_device_authorizations_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "oauth_device_authorizations_user_id_fkey"
    }).onDelete("cascade"),
  check("oauth_device_authorizations_interval_seconds_check", sql`(interval_seconds >= 5) AND (interval_seconds <= 300)`),
  check("oauth_device_authorizations_mode_check", sql`mode = ANY (ARRAY['read-only'::text, 'proposal-only'::text, 'direct'::text])`),
  check("oauth_device_authorizations_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'consumed'::text])`),
  check("oauth_device_authorizations_verification_attempts_check", sql`(verification_attempts >= 0) AND (verification_attempts <= 10)`),
]);

export const oauth_token_creeds = pgTable("oauth_token_creeds", {
  token_id: uuid().notNull(),
  creed_id: uuid().notNull(),
  mode: text().default('proposal-only').notNull(),
}, (table) => [
  index("oauth_token_creeds_creed_idx").using("btree", table.creed_id.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "oauth_token_creeds_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.token_id],
      foreignColumns: [oauth_tokens.id],
      name: "oauth_token_creeds_token_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.token_id, table.creed_id], name: "oauth_token_creeds_pkey"}),
  check("oauth_token_creeds_mode_check", sql`mode = ANY (ARRAY['read-only'::text, 'proposal-only'::text, 'direct'::text])`),
]);

export const creed_members = pgTable("creed_members", {
  creed_id: uuid().notNull(),
  user_id: uuid().notNull(),
  role: text().notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  uniqueIndex("creed_members_one_owner_per_creed").using("btree", table.creed_id.asc().nullsLast()).where(sql`(role = 'owner'::text)`),
  index("creed_members_user_idx").using("btree", table.user_id.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_members_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_members_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.creed_id, table.user_id], name: "creed_members_pkey"}),
  check("creed_members_role_check", sql`role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])`),
]);

export const creed_member_agent_permissions = pgTable("creed_member_agent_permissions", {
  creed_id: uuid().notNull(),
  user_id: uuid().notNull(),
  section_id: text().notNull(),
  permission: text().default('propose').notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  index("creed_member_agent_permissions_user_id_idx").using("btree", table.user_id.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_member_agent_permissions_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_member_agent_permissions_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.creed_id, table.user_id, table.section_id], name: "creed_member_agent_permissions_pkey"}),
  check("creed_member_agent_permissions_permission_check", sql`permission = ANY (ARRAY['hidden'::text, 'read-only'::text, 'propose'::text, 'direct'::text])`),
]);

export const strap_skill_versions = pgTable("strap_skill_versions", {
  skill_id: uuid().notNull(),
  revision: integer().notNull(),
  document: jsonb().notNull(),
  summary: jsonb().generatedAlwaysAs(sql`(document - 'files'::text)`),
  storage_bytes: integer().generatedAlwaysAs(sql`octet_length((document)::text)`),
}, (table) => [
  foreignKey({
      columns: [table.skill_id],
      foreignColumns: [strap_skills.id],
      name: "strap_skill_versions_skill_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.skill_id, table.revision], name: "strap_skill_versions_pkey"}),
  check("strap_skill_versions_revision_check", sql`revision > 0`),
]);

export const creed_member_section_permissions = pgTable("creed_member_section_permissions", {
  creed_id: uuid().notNull(),
  user_id: uuid().notNull(),
  section_id: text().notNull(),
  permission: text().notNull(),
  updated_by: uuid(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
}, (table) => [
  index("creed_member_section_permissions_user_idx").using("btree", table.user_id.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_member_section_permissions_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_member_section_permissions_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.creed_id, table.user_id, table.section_id], name: "creed_member_section_permissions_pkey"}),
  check("creed_member_section_permissions_permission_check", sql`permission = ANY (ARRAY['hidden'::text, 'read-only'::text, 'propose'::text, 'direct'::text])`),
]);

export const creed_mcp_clients = pgTable("creed_mcp_clients", {
  user_id: uuid().notNull(),
  client_id: text().notNull(),
  client_name: text().notNull(),
  last_seen_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_id: uuid().notNull(),
}, (table) => [
  index("creed_mcp_clients_creed_last_seen_idx").using("btree", table.creed_id.asc().nullsLast(), table.last_seen_at.desc().nullsFirst()),
  index("creed_mcp_clients_user_last_seen_idx").using("btree", table.user_id.asc().nullsLast(), table.last_seen_at.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_mcp_clients_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_mcp_clients_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.creed_id, table.client_id], name: "creed_mcp_clients_pkey"}),
]);

export const creed_mcp_read_events = pgTable("creed_mcp_read_events", {
  user_id: uuid().notNull(),
  client_id: text().notNull(),
  day: date().notNull(),
  read_count: integer().default(0).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_id: uuid().notNull(),
}, (table) => [
  index("creed_mcp_read_events_creed_day_idx").using("btree", table.creed_id.asc().nullsLast(), table.day.desc().nullsFirst()),
  index("creed_mcp_read_events_user_day_idx").using("btree", table.user_id.asc().nullsLast(), table.day.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_mcp_read_events_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_mcp_read_events_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.creed_id, table.client_id, table.day], name: "creed_mcp_read_events_pkey"}),
]);

export const creed_connections = pgTable("creed_connections", {
  user_id: uuid().notNull(),
  connection_id: text().notNull(),
  status: text().default('not-connected').notNull(),
  last_seen_at: timestamp({ withTimezone: true, mode: 'string' }),
  last_agent_name: text(),
  observed_via: text(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  creed_id: uuid().notNull(),
}, (table) => [
  index("creed_connections_creed_updated_idx").using("btree", table.creed_id.asc().nullsLast(), table.updated_at.desc().nullsFirst()),
  index("creed_connections_user_updated_idx").using("btree", table.user_id.asc().nullsLast(), table.updated_at.desc().nullsFirst()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_connections_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_connections_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.creed_id, table.connection_id], name: "creed_connections_pkey"}),
]);

export const creed_integrations = pgTable("creed_integrations", {
  user_id: uuid().notNull(),
  provider: text().notNull(),
  status: text().default('connected').notNull(),
  provider_account_id: text(),
  provider_login: text(),
  access_token: text(),
  refresh_token: text(),
  token_expires_at: timestamp({ withTimezone: true, mode: 'string' }),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  encrypted_access_token: text(),
  encrypted_refresh_token: text(),
}, (table) => [
  index("creed_integrations_user_provider_idx").using("btree", table.user_id.asc().nullsLast(), table.provider.asc().nullsLast()),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_integrations_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.user_id, table.provider], name: "creed_integrations_pkey"}),
]);

export const creed_sections = pgTable("creed_sections", {
  user_id: uuid().notNull(),
  section_id: text().notNull(),
  position: integer().default(0).notNull(),
  kind: text().notNull(),
  name: text().notNull(),
  accent: text().notNull(),
  payload: jsonb().default({}).notNull(),
  last_edited_by: text().notNull(),
  last_edited_type: text().notNull(),
  last_edited_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  revision: integer().default(1).notNull(),
  created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
  agent_writable: boolean().default(false).notNull(),
  template: text().default('freeform').notNull(),
  agent_permission: text().default('propose').notNull(),
  archived_at: timestamp({ withTimezone: true, mode: 'string' }),
  creed_id: uuid().notNull(),
  deleted_at: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
  index("creed_sections_creed_position_idx").using("btree", table.creed_id.asc().nullsLast(), table.position.asc().nullsLast()),
  index("creed_sections_template_idx").using("btree", table.template.asc().nullsLast()),
  index("creed_sections_user_position_idx").using("btree", table.user_id.asc().nullsLast(), table.position.asc().nullsLast()),
  foreignKey({
      columns: [table.creed_id],
      foreignColumns: [creeds.id],
      name: "creed_sections_creed_id_fkey"
    }).onDelete("cascade"),
  foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
      name: "creed_sections_user_id_fkey"
    }).onDelete("cascade"),
  primaryKey({ columns: [table.creed_id, table.section_id], name: "creed_sections_pkey"}),
  check("creed_sections_agent_permission_check", sql`agent_permission = ANY (ARRAY['hidden'::text, 'read-only'::text, 'propose'::text, 'direct'::text])`),
]);
