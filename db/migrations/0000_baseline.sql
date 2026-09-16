CREATE TABLE "creed_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"proposal_id" text,
	"section_id" text,
	"section_name" text,
	"accent" text,
	"actor" text NOT NULL,
	"actor_type" text NOT NULL,
	"summary" text NOT NULL,
	"status" text NOT NULL,
	"change_type" text,
	"reason" text,
	"impact" text,
	"confidence" text,
	"before_text" text,
	"after_text" text,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_kind" text DEFAULT 'edit' NOT NULL,
	CONSTRAINT "creed_activity_event_kind_check" CHECK (event_kind = ANY (ARRAY['edit'::text, 'proposal'::text, 'membership'::text, 'role'::text, 'permission'::text, 'billing'::text, 'usage'::text, 'byok'::text, 'ownership'::text, 'section-trash'::text, 'restore'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_ai_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'openrouter' NOT NULL,
	"selected_model_id" text,
	"encrypted_api_key" text,
	"api_key_last_four" text,
	"key_status" text DEFAULT 'missing' NOT NULL,
	"last_validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"ai_mode" text DEFAULT 'credits' NOT NULL,
	CONSTRAINT "creed_ai_settings_ai_mode_check" CHECK (ai_mode = ANY (ARRAY['credits'::text, 'byok'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_ai_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"provider" text DEFAULT 'openrouter' NOT NULL,
	"model_id" text NOT NULL,
	"model_quality" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" numeric(12, 6) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"ai_mode" text DEFAULT 'byok' NOT NULL,
	"charged_micro_usd" bigint,
	"creed_id" uuid,
	CONSTRAINT "creed_ai_usage_ai_mode_check" CHECK (ai_mode = ANY (ARRAY['credits'::text, 'byok'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"creed_id" uuid
);
--> statement-breakpoint
CREATE TABLE "creed_company_ai_settings" (
	"creed_id" uuid PRIMARY KEY NOT NULL,
	"ai_mode" text DEFAULT 'credits' NOT NULL,
	"encrypted_openrouter_key" text,
	"openrouter_key_hash" text,
	"api_key_last_four" text,
	"key_status" text DEFAULT 'missing' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_company_ai_settings_ai_mode_check" CHECK (ai_mode = ANY (ARRAY['credits'::text, 'byok'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_company_billing" (
	"creed_id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_session_id" text,
	"stripe_subscription_id" text,
	"billing_mode" text NOT NULL,
	"billing_interval" text,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"seats_included" integer DEFAULT 10 NOT NULL,
	"extra_seats" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer,
	"currency" text DEFAULT 'usd',
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"stripe_payment_intent_id" text,
	"welcomed_at" timestamp with time zone,
	CONSTRAINT "creed_company_billing_stripe_session_id_key" UNIQUE("stripe_session_id"),
	CONSTRAINT "creed_company_billing_billing_interval_check" CHECK (billing_interval = ANY (ARRAY['month'::text, 'year'::text])),
	CONSTRAINT "creed_company_billing_billing_mode_check" CHECK (billing_mode = ANY (ARRAY['subscription'::text, 'lifetime'::text])),
	CONSTRAINT "creed_company_billing_status_check" CHECK (status = ANY (ARRAY['paid'::text, 'refunded'::text, 'active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_company_github_integration" (
	"creed_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'github' NOT NULL,
	"status" text DEFAULT 'not-connected' NOT NULL,
	"provider_account_id" text,
	"provider_login" text,
	"encrypted_access_token" text,
	"encrypted_refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"connected_by" uuid,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_company_github_integration_status_check" CHECK (status = ANY (ARRAY['connected'::text, 'not-connected'::text, 'disconnected'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_company_version_control" (
	"creed_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'github' NOT NULL,
	"configured_by" uuid,
	"repo_owner" text,
	"repo_name" text,
	"branch" text,
	"path" text DEFAULT 'strap.md' NOT NULL,
	"last_remote_sha" text,
	"last_remote_message" text,
	"last_remote_committed_at" timestamp with time zone,
	"last_synced_content_hash" text,
	"sync_status" text DEFAULT 'not-configured' NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creed_connections" (
	"user_id" uuid NOT NULL,
	"connection_id" text NOT NULL,
	"status" text DEFAULT 'not-connected' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_agent_name" text,
	"observed_via" text,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_id" uuid NOT NULL,
	CONSTRAINT "creed_connections_pkey" PRIMARY KEY("creed_id","connection_id")
);
--> statement-breakpoint
CREATE TABLE "creed_credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"amount_micro_usd" bigint NOT NULL,
	"balance_after_micro_usd" bigint NOT NULL,
	"feature" text,
	"model_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"bucket" text,
	"grant_period_key" text,
	"creed_id" uuid NOT NULL,
	"spent_by_user_id" uuid,
	CONSTRAINT "creed_credit_transactions_stripe_payment_intent_id_key" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "creed_credit_transactions_amount_micro_usd_check" CHECK (amount_micro_usd >= 0),
	CONSTRAINT "creed_credit_transactions_bucket_check" CHECK ((bucket IS NULL) OR (bucket = ANY (ARRAY['granted'::text, 'purchased'::text, 'mixed'::text]))),
	CONSTRAINT "creed_credit_transactions_check" CHECK ((type <> 'topup'::text) OR (stripe_payment_intent_id IS NOT NULL)),
	CONSTRAINT "creed_credit_transactions_type_check" CHECK (type = ANY (ARRAY['topup'::text, 'debit'::text, 'grant'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_credits" (
	"user_id" uuid,
	"balance_micro_usd" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"granted_micro_usd" bigint DEFAULT 0 NOT NULL,
	"purchased_micro_usd" bigint DEFAULT 0 NOT NULL,
	"grant_period_key" text,
	"grant_period_start" timestamp with time zone,
	"creed_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creed_entitlements" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_price_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"plan" text DEFAULT 'personal' NOT NULL,
	"billing_mode" text DEFAULT 'lifetime' NOT NULL,
	"stripe_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"billing_interval" text,
	"welcomed_at" timestamp with time zone,
	CONSTRAINT "creed_entitlements_stripe_session_id_key" UNIQUE("stripe_session_id"),
	CONSTRAINT "creed_entitlements_billing_interval_check" CHECK ((billing_interval IS NULL) OR (billing_interval = ANY (ARRAY['month'::text, 'year'::text]))),
	CONSTRAINT "creed_entitlements_billing_mode_check" CHECK (billing_mode = ANY (ARRAY['subscription'::text, 'lifetime'::text])),
	CONSTRAINT "creed_entitlements_plan_check" CHECK (plan = ANY (ARRAY['personal'::text, 'company'::text])),
	CONSTRAINT "creed_entitlements_status_check" CHECK (status = ANY (ARRAY['paid'::text, 'refunded'::text, 'active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_getting_started" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"steps" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creed_headless_access_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creed_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"mode" text DEFAULT 'proposal-only' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_headless_access_keys_key_prefix_check" CHECK ((char_length(key_prefix) >= 8) AND (char_length(key_prefix) <= 32)),
	CONSTRAINT "creed_headless_access_keys_mode_check" CHECK (mode = ANY (ARRAY['read-only'::text, 'proposal-only'::text, 'direct'::text])),
	CONSTRAINT "creed_headless_access_keys_name_check" CHECK ((char_length(name) >= 1) AND (char_length(name) <= 120))
);
--> statement-breakpoint
CREATE TABLE "creed_integrations" (
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"provider_account_id" text,
	"provider_login" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"encrypted_access_token" text,
	"encrypted_refresh_token" text,
	CONSTRAINT "creed_integrations_pkey" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "creed_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creed_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_invites_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "creed_invites_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
	CONSTRAINT "creed_invites_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text, 'declined'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_mcp_clients" (
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"client_name" text NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_id" uuid NOT NULL,
	CONSTRAINT "creed_mcp_clients_pkey" PRIMARY KEY("creed_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "creed_mcp_read_events" (
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"read_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_id" uuid NOT NULL,
	CONSTRAINT "creed_mcp_read_events_pkey" PRIMARY KEY("creed_id","client_id","day")
);
--> statement-breakpoint
CREATE TABLE "creed_member_agent_permissions" (
	"creed_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"section_id" text NOT NULL,
	"permission" text DEFAULT 'propose' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_member_agent_permissions_pkey" PRIMARY KEY("creed_id","user_id","section_id"),
	CONSTRAINT "creed_member_agent_permissions_permission_check" CHECK (permission = ANY (ARRAY['hidden'::text, 'read-only'::text, 'propose'::text, 'direct'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_member_section_permissions" (
	"creed_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"section_id" text NOT NULL,
	"permission" text NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_member_section_permissions_pkey" PRIMARY KEY("creed_id","user_id","section_id"),
	CONSTRAINT "creed_member_section_permissions_permission_check" CHECK (permission = ANY (ARRAY['hidden'::text, 'read-only'::text, 'propose'::text, 'direct'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_members" (
	"creed_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_members_pkey" PRIMARY KEY("creed_id","user_id"),
	CONSTRAINT "creed_members_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"section_id" text NOT NULL,
	"section_name" text NOT NULL,
	"accent" text NOT NULL,
	"agent_name" text NOT NULL,
	"change_type" text NOT NULL,
	"reason" text NOT NULL,
	"impact" text NOT NULL,
	"confidence" text NOT NULL,
	"draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"base_revision" integer,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_id" uuid NOT NULL,
	"author_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "creed_quality_reports" (
	"section_hashes" jsonb,
	"user_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"model_id" text NOT NULL,
	"report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creed_seat_purchases" (
	"stripe_session_id" text PRIMARY KEY NOT NULL,
	"creed_id" uuid NOT NULL,
	"seats" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_seat_purchases_seats_check" CHECK (seats > 0)
);
--> statement-breakpoint
CREATE TABLE "creed_section_versions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "creed_section_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"creed_id" uuid NOT NULL,
	"section_id" text NOT NULL,
	"revision" integer NOT NULL,
	"name" text NOT NULL,
	"accent" text NOT NULL,
	"content" text NOT NULL,
	"actor_user_id" uuid,
	"actor_type" text NOT NULL,
	"agent_name" text,
	"cause" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "creed_section_versions_actor_type_check" CHECK (actor_type = ANY (ARRAY['user'::text, 'agent'::text])),
	CONSTRAINT "creed_section_versions_cause_check" CHECK (cause = ANY (ARRAY['manual'::text, 'mcp'::text, 'proposal'::text, 'restore'::text, 'import'::text, 'onboarding'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_sections" (
	"user_id" uuid NOT NULL,
	"section_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"accent" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_edited_by" text NOT NULL,
	"last_edited_type" text NOT NULL,
	"last_edited_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"agent_writable" boolean DEFAULT false NOT NULL,
	"template" text DEFAULT 'freeform' NOT NULL,
	"agent_permission" text DEFAULT 'propose' NOT NULL,
	"archived_at" timestamp with time zone,
	"creed_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "creed_sections_pkey" PRIMARY KEY("creed_id","section_id"),
	CONSTRAINT "creed_sections_agent_permission_check" CHECK (agent_permission = ANY (ARRAY['hidden'::text, 'read-only'::text, 'propose'::text, 'direct'::text]))
);
--> statement-breakpoint
CREATE TABLE "creed_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"read_token" text,
	"proposal_token" text,
	"require_approval" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"read_token_hash" text,
	"proposal_token_hash" text,
	"direct_edit_token" text,
	"direct_edit_token_hash" text,
	"encrypted_read_token" text,
	"encrypted_proposal_token" text,
	"encrypted_direct_edit_token" text
);
--> statement-breakpoint
CREATE TABLE "creed_vault_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creed_id" uuid NOT NULL,
	"secret_ciphertext" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"last_accessed_at" timestamp with time zone,
	CONSTRAINT "creed_vault_items_description_check" CHECK (char_length(description) <= 500),
	CONSTRAINT "creed_vault_items_name_check" CHECK ((char_length(name) >= 1) AND (char_length(name) <= 120))
);
--> statement-breakpoint
CREATE TABLE "creed_version_control" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'github' NOT NULL,
	"repo_owner" text,
	"repo_name" text,
	"branch" text,
	"path" text DEFAULT 'strap.md' NOT NULL,
	"last_remote_sha" text,
	"last_remote_message" text,
	"last_remote_committed_at" timestamp with time zone,
	"last_synced_content_hash" text,
	"sync_status" text DEFAULT 'not-configured' NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"onboarding_stage" text,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"company_email" text,
	"avatar_url" text,
	CONSTRAINT "creeds_type_check" CHECK (type = ANY (ARRAY['personal'::text, 'company'::text]))
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"scope" text DEFAULT 'read propose' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_grants" jsonb
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"client_name" text DEFAULT 'MCP Client' NOT NULL,
	"redirect_uris" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_device_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_code_hash" text NOT NULL,
	"user_code_hash" text NOT NULL,
	"client_id" text NOT NULL,
	"scope" text DEFAULT 'read propose' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"user_id" uuid,
	"creed_id" uuid,
	"mode" text,
	"verification_attempts" integer DEFAULT 0 NOT NULL,
	"interval_seconds" integer DEFAULT 5 NOT NULL,
	"next_poll_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "oauth_device_authorizations_interval_seconds_check" CHECK ((interval_seconds >= 5) AND (interval_seconds <= 300)),
	CONSTRAINT "oauth_device_authorizations_mode_check" CHECK (mode = ANY (ARRAY['read-only'::text, 'proposal-only'::text, 'direct'::text])),
	CONSTRAINT "oauth_device_authorizations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'consumed'::text])),
	CONSTRAINT "oauth_device_authorizations_verification_attempts_check" CHECK ((verification_attempts >= 0) AND (verification_attempts <= 10))
);
--> statement-breakpoint
CREATE TABLE "oauth_token_creeds" (
	"token_id" uuid NOT NULL,
	"creed_id" uuid NOT NULL,
	"mode" text DEFAULT 'proposal-only' NOT NULL,
	CONSTRAINT "oauth_token_creeds_pkey" PRIMARY KEY("token_id","creed_id"),
	CONSTRAINT "oauth_token_creeds_mode_check" CHECK (mode = ANY (ARRAY['read-only'::text, 'proposal-only'::text, 'direct'::text]))
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_token_hash" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"client_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" text DEFAULT 'read propose' NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"creed_grants_explicit" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strap_skill_versions" (
	"skill_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"document" jsonb NOT NULL,
	"summary" jsonb GENERATED ALWAYS AS ((document - 'files'::text)) STORED,
	"storage_bytes" integer GENERATED ALWAYS AS (octet_length((document)::text)) STORED,
	CONSTRAINT "strap_skill_versions_pkey" PRIMARY KEY("skill_id","revision"),
	CONSTRAINT "strap_skill_versions_revision_check" CHECK (revision > 0)
);
--> statement-breakpoint
CREATE TABLE "strap_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strap_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"revision" integer NOT NULL,
	"digest" text NOT NULL,
	"files" jsonb NOT NULL,
	"byte_count" integer NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"file_count" integer GENERATED ALWAYS AS (jsonb_array_length(files)) STORED,
	"storage_bytes" integer GENERATED ALWAYS AS (octet_length((files)::text)) STORED,
	CONSTRAINT "strap_skills_strap_id_name_key" UNIQUE("strap_id","name"),
	CONSTRAINT "strap_skills_byte_count_check" CHECK ((byte_count >= 1) AND (byte_count <= 2097152)),
	CONSTRAINT "strap_skills_description_check" CHECK ((length(description) >= 1) AND (length(description) <= 1024)),
	CONSTRAINT "strap_skills_digest_check" CHECK (digest ~ '^[a-f0-9]{64}$'::text),
	CONSTRAINT "strap_skills_files_check" CHECK ((jsonb_typeof(files) = 'array'::text) AND ((jsonb_array_length(files) >= 1) AND (jsonb_array_length(files) <= 128)) AND (octet_length((files)::text) <= 12582912)),
	CONSTRAINT "strap_skills_name_check" CHECK ((length(name) >= 1) AND (length(name) <= 64) AND (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
	CONSTRAINT "strap_skills_revision_check" CHECK (revision > 0)
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_provider_account_key" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" bigint NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creed_avatars" (
	"creed_id" uuid PRIMARY KEY NOT NULL,
	"body" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creed_avatar_size" CHECK (octet_length("creed_avatars"."body") between 1 and 3145728)
);
--> statement-breakpoint
CREATE TABLE "user_avatars" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"body" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_avatar_size" CHECK (octet_length("user_avatars"."body") between 1 and 3145728)
);
--> statement-breakpoint
ALTER TABLE "creed_activity" ADD CONSTRAINT "creed_activity_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_activity" ADD CONSTRAINT "creed_activity_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."creed_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_activity" ADD CONSTRAINT "creed_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_ai_settings" ADD CONSTRAINT "creed_ai_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_ai_usage" ADD CONSTRAINT "creed_ai_usage_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_ai_usage" ADD CONSTRAINT "creed_ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_audit_log" ADD CONSTRAINT "creed_audit_log_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_audit_log" ADD CONSTRAINT "creed_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_company_ai_settings" ADD CONSTRAINT "creed_company_ai_settings_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_company_billing" ADD CONSTRAINT "creed_company_billing_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_company_github_integration" ADD CONSTRAINT "creed_company_github_integration_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_company_version_control" ADD CONSTRAINT "creed_company_version_control_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_connections" ADD CONSTRAINT "creed_connections_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_connections" ADD CONSTRAINT "creed_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_credit_transactions" ADD CONSTRAINT "creed_credit_transactions_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_credit_transactions" ADD CONSTRAINT "creed_credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_credits" ADD CONSTRAINT "creed_credits_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_credits" ADD CONSTRAINT "creed_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_entitlements" ADD CONSTRAINT "creed_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_getting_started" ADD CONSTRAINT "creed_getting_started_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_headless_access_keys" ADD CONSTRAINT "creed_headless_access_keys_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_headless_access_keys" ADD CONSTRAINT "creed_headless_access_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_integrations" ADD CONSTRAINT "creed_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_invites" ADD CONSTRAINT "creed_invites_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_mcp_clients" ADD CONSTRAINT "creed_mcp_clients_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_mcp_clients" ADD CONSTRAINT "creed_mcp_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_mcp_read_events" ADD CONSTRAINT "creed_mcp_read_events_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_mcp_read_events" ADD CONSTRAINT "creed_mcp_read_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_member_agent_permissions" ADD CONSTRAINT "creed_member_agent_permissions_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_member_agent_permissions" ADD CONSTRAINT "creed_member_agent_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_member_section_permissions" ADD CONSTRAINT "creed_member_section_permissions_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_member_section_permissions" ADD CONSTRAINT "creed_member_section_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_members" ADD CONSTRAINT "creed_members_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_members" ADD CONSTRAINT "creed_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_proposals" ADD CONSTRAINT "creed_proposals_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_proposals" ADD CONSTRAINT "creed_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_quality_reports" ADD CONSTRAINT "creed_quality_reports_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_quality_reports" ADD CONSTRAINT "creed_quality_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_seat_purchases" ADD CONSTRAINT "creed_seat_purchases_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_section_versions" ADD CONSTRAINT "creed_section_versions_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_sections" ADD CONSTRAINT "creed_sections_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_sections" ADD CONSTRAINT "creed_sections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_tokens" ADD CONSTRAINT "creed_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_vault_items" ADD CONSTRAINT "creed_vault_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_vault_items" ADD CONSTRAINT "creed_vault_items_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_version_control" ADD CONSTRAINT "creed_version_control_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creeds" ADD CONSTRAINT "creeds_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_device_authorizations" ADD CONSTRAINT "oauth_device_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_device_authorizations" ADD CONSTRAINT "oauth_device_authorizations_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_device_authorizations" ADD CONSTRAINT "oauth_device_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_token_creeds" ADD CONSTRAINT "oauth_token_creeds_creed_id_fkey" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_token_creeds" ADD CONSTRAINT "oauth_token_creeds_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."oauth_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strap_skill_versions" ADD CONSTRAINT "strap_skill_versions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."strap_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strap_skills" ADD CONSTRAINT "strap_skills_strap_id_fkey" FOREIGN KEY ("strap_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strap_skills" ADD CONSTRAINT "strap_skills_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creed_avatars" ADD CONSTRAINT "creed_avatars_creed_id_creeds_id_fk" FOREIGN KEY ("creed_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creed_activity_created_idx" ON "creed_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "creed_activity_creed_created_idx" ON "creed_activity" USING btree ("creed_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_activity_proposal_id_idx" ON "creed_activity" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "creed_activity_user_created_idx" ON "creed_activity" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_ai_usage_creed_created_idx" ON "creed_ai_usage" USING btree ("creed_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_ai_usage_user_created_idx" ON "creed_ai_usage" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_audit_log_action_created_at_idx" ON "creed_audit_log" USING btree ("action","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_audit_log_creed_created_idx" ON "creed_audit_log" USING btree ("creed_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_audit_log_user_id_created_at_idx" ON "creed_audit_log" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_company_billing_payment_intent_idx" ON "creed_company_billing" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "creed_connections_creed_updated_idx" ON "creed_connections" USING btree ("creed_id","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_connections_user_updated_idx" ON "creed_connections" USING btree ("user_id","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_credit_transactions_creed_created_idx" ON "creed_credit_transactions" USING btree ("creed_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "creed_credit_transactions_grant_period_idx" ON "creed_credit_transactions" USING btree ("user_id","grant_period_key") WHERE (type = 'grant'::text);--> statement-breakpoint
CREATE INDEX "creed_credit_transactions_user_created_idx" ON "creed_credit_transactions" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_credits_user_id_idx" ON "creed_credits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "creed_entitlements_customer_id_idx" ON "creed_entitlements" USING btree ("stripe_customer_id") WHERE (stripe_customer_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "creed_entitlements_subscription_id_key" ON "creed_entitlements" USING btree ("stripe_subscription_id") WHERE (stripe_subscription_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "creed_headless_access_keys_hash_idx" ON "creed_headless_access_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "creed_headless_access_keys_user_creed_idx" ON "creed_headless_access_keys" USING btree ("user_id","creed_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_integrations_user_provider_idx" ON "creed_integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "creed_invites_creed_idx" ON "creed_invites" USING btree ("creed_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creed_invites_one_pending_per_email" ON "creed_invites" USING btree (creed_id,lower(email)) WHERE (status = 'pending'::text);--> statement-breakpoint
CREATE INDEX "creed_mcp_clients_creed_last_seen_idx" ON "creed_mcp_clients" USING btree ("creed_id","last_seen_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_mcp_clients_user_last_seen_idx" ON "creed_mcp_clients" USING btree ("user_id","last_seen_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_mcp_read_events_creed_day_idx" ON "creed_mcp_read_events" USING btree ("creed_id","day" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_mcp_read_events_user_day_idx" ON "creed_mcp_read_events" USING btree ("user_id","day" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_member_agent_permissions_user_id_idx" ON "creed_member_agent_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "creed_member_section_permissions_user_idx" ON "creed_member_section_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creed_members_one_owner_per_creed" ON "creed_members" USING btree ("creed_id") WHERE (role = 'owner'::text);--> statement-breakpoint
CREATE INDEX "creed_members_user_idx" ON "creed_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "creed_proposals_creed_created_idx" ON "creed_proposals" USING btree ("creed_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_proposals_creed_status_idx" ON "creed_proposals" USING btree ("creed_id","status");--> statement-breakpoint
CREATE INDEX "creed_quality_reports_creed_hash_idx" ON "creed_quality_reports" USING btree ("creed_id","content_hash");--> statement-breakpoint
CREATE INDEX "creed_quality_reports_user_hash_idx" ON "creed_quality_reports" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE INDEX "creed_seat_purchases_creed_id_idx" ON "creed_seat_purchases" USING btree ("creed_id");--> statement-breakpoint
CREATE INDEX "creed_section_versions_lookup_idx" ON "creed_section_versions" USING btree ("creed_id","section_id","id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "creed_sections_creed_position_idx" ON "creed_sections" USING btree ("creed_id","position");--> statement-breakpoint
CREATE INDEX "creed_sections_template_idx" ON "creed_sections" USING btree ("template");--> statement-breakpoint
CREATE INDEX "creed_sections_user_position_idx" ON "creed_sections" USING btree ("user_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "creed_tokens_direct_edit_token_hash_idx" ON "creed_tokens" USING btree ("direct_edit_token_hash") WHERE (direct_edit_token_hash IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "creed_tokens_proposal_token_hash_idx" ON "creed_tokens" USING btree ("proposal_token_hash") WHERE (proposal_token_hash IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "creed_tokens_read_token_hash_idx" ON "creed_tokens" USING btree ("read_token_hash") WHERE (read_token_hash IS NOT NULL);--> statement-breakpoint
CREATE INDEX "creed_vault_items_creed_created_idx" ON "creed_vault_items" USING btree ("creed_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "creed_vault_items_name_idx" ON "creed_vault_items" USING btree (creed_id,lower(name));--> statement-breakpoint
CREATE UNIQUE INDEX "creeds_one_company_per_owner" ON "creeds" USING btree ("owner_user_id") WHERE (type = 'company'::text);--> statement-breakpoint
CREATE UNIQUE INDEX "creeds_one_personal_per_owner" ON "creeds" USING btree ("owner_user_id") WHERE (type = 'personal'::text);--> statement-breakpoint
CREATE INDEX "creeds_owner_idx" ON "creeds" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "oauth_authorization_codes_user_idx" ON "oauth_authorization_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_device_authorizations_device_hash_idx" ON "oauth_device_authorizations" USING btree ("device_code_hash");--> statement-breakpoint
CREATE INDEX "oauth_device_authorizations_expiry_idx" ON "oauth_device_authorizations" USING btree ("expires_at") WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text]));--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_device_authorizations_user_hash_idx" ON "oauth_device_authorizations" USING btree ("user_code_hash") WHERE (status = 'pending'::text);--> statement-breakpoint
CREATE INDEX "oauth_token_creeds_creed_idx" ON "oauth_token_creeds" USING btree ("creed_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_tokens_access_hash_idx" ON "oauth_tokens" USING btree ("access_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_tokens_refresh_hash_idx" ON "oauth_tokens" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "oauth_tokens_user_client_idx" ON "oauth_tokens" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "strap_skills_updated_by_idx" ON "strap_skills" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");
--> statement-breakpoint
--
-- Name: consume_oauth_device_authorization(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_oauth_device_authorization(p_device_code_hash text, p_client_id text) RETURNS TABLE(outcome text, authorized_user_id uuid, authorized_scope text, authorized_creed_id uuid, authorized_mode text, retry_after_seconds integer)
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO ''
    AS $$
declare
  v_row public.oauth_device_authorizations%rowtype;
  v_now timestamptz := timezone('utc'::text, now());
begin
  select * into v_row
  from public.oauth_device_authorizations
  where device_code_hash = p_device_code_hash
  for update;

  if not found or v_row.client_id <> p_client_id then
    return query select 'invalid_grant'::text, null::uuid, null::text, null::uuid, null::text, null::integer;
    return;
  end if;

  if v_row.expires_at <= v_now or v_row.status = 'consumed' then
    return query select 'expired_token'::text, null::uuid, null::text, null::uuid, null::text, null::integer;
    return;
  end if;

  if v_row.status = 'denied' then
    return query select 'access_denied'::text, null::uuid, null::text, null::uuid, null::text, null::integer;
    return;
  end if;

  if v_row.status = 'approved' then
    update public.oauth_device_authorizations
      set status = 'consumed', consumed_at = v_now
      where id = v_row.id and status = 'approved';
    return query select
      'approved'::text,
      v_row.user_id,
      v_row.scope,
      v_row.creed_id,
      v_row.mode,
      null::integer;
    return;
  end if;

  if v_row.next_poll_at > v_now then
    v_row.interval_seconds := least(v_row.interval_seconds + 5, 300);
    update public.oauth_device_authorizations
      set interval_seconds = v_row.interval_seconds,
          next_poll_at = v_now + make_interval(secs => v_row.interval_seconds)
      where id = v_row.id;
    return query select 'slow_down'::text, null::uuid, null::text, null::uuid, null::text, v_row.interval_seconds;
    return;
  end if;

  update public.oauth_device_authorizations
    set next_poll_at = v_now + make_interval(secs => v_row.interval_seconds)
    where id = v_row.id;
  return query select 'authorization_pending'::text, null::uuid, null::text, null::uuid, null::text, v_row.interval_seconds;
end;
$$;

--
-- Name: increment_mcp_read_for_creed(uuid, uuid, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_mcp_read_for_creed(p_creed_id uuid, p_reader_user_id uuid, p_client_id text, p_day date) RETURNS void
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO 'public'
    AS $$
begin
  if p_creed_id is null or p_reader_user_id is null then
    raise exception 'creed id and reader user id are required';
  end if;

  if not exists (
    select 1
    from public.creed_members
    where creed_id = p_creed_id
      and user_id = p_reader_user_id
  ) then
    raise exception 'reader is not an active member of this creed';
  end if;

  insert into public.creed_mcp_read_events (creed_id, user_id, client_id, day, read_count)
  values (p_creed_id, p_reader_user_id, p_client_id, p_day, 1)
  on conflict (creed_id, client_id, day)
  do update set
    read_count = public.creed_mcp_read_events.read_count + 1,
    updated_at = timezone('utc'::text, now());
end;
$$;

--
-- Name: provision_company_creed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.provision_company_creed(p_owner uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO ''
    AS $$
declare
  v_creed_id uuid;
begin
  if p_owner is null then
    raise exception 'Company owner is required' using errcode = '22004';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('strap:company:' || p_owner::text, 0)
  );

  select id into v_creed_id
  from public.creeds
  where owner_user_id = p_owner and type = 'company'
  order by created_at asc, id asc
  limit 1;

  if v_creed_id is null then
    insert into public.creeds (type, name, owner_user_id, onboarding_stage)
    values ('company', 'Your company', p_owner, 'questions')
    returning id into v_creed_id;
  end if;

  insert into public.creed_members (creed_id, user_id, role)
  values (v_creed_id, p_owner, 'owner')
  on conflict (creed_id, user_id) do update set role = 'owner';

  return v_creed_id;
end;
$$;

--
-- Name: record_oauth_device_verification(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_oauth_device_verification(p_user_code_hash text) RETURNS TABLE(request_id uuid, requesting_client_id text, requested_scope text)
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO ''
    AS $$
declare
  v_row public.oauth_device_authorizations%rowtype;
  v_attempts integer;
begin
  select * into v_row
  from public.oauth_device_authorizations
  where user_code_hash = p_user_code_hash
    and status = 'pending'
    and expires_at > timezone('utc'::text, now())
  for update;

  if not found then
    return;
  end if;

  v_attempts := v_row.verification_attempts + 1;
  update public.oauth_device_authorizations
    set verification_attempts = v_attempts,
        status = case when v_attempts >= 10 then 'denied' else status end
    where id = v_row.id;

  if v_attempts >= 10 then
    return;
  end if;

  return query select v_row.id, v_row.client_id, v_row.scope;
end;
$$;




--
-- Name: strap_skill_document(public.strap_skills); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strap_skill_document(p_skill public.strap_skills) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select jsonb_build_object(
    'id', p_skill.id, 'strapId', p_skill.strap_id, 'name', p_skill.name,
    'description', p_skill.description, 'revision', p_skill.revision,
    'digest', p_skill.digest, 'files', p_skill.files,
    'fileCount', jsonb_array_length(p_skill.files), 'byteCount', p_skill.byte_count,
    'archived', p_skill.archived, 'updatedAt', p_skill.updated_at
  );
$$;

--
-- Name: strap_skill_publish(uuid, uuid, text, integer, text, jsonb, text, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strap_skill_publish(p_user_id uuid, p_strap_id uuid, p_name text, p_base_revision integer, p_description text DEFAULT NULL::text, p_files jsonb DEFAULT NULL::jsonb, p_digest text DEFAULT NULL::text, p_byte_count integer DEFAULT NULL::integer, p_archived boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_role text;
  v_skill public.strap_skills;
  v_document jsonb;
  v_usage bigint;
  v_limit constant bigint := 67108864;
begin
  -- This profile lock serializes both revisions and aggregate storage accounting.
  perform 1 from public.creeds where id = p_strap_id for update;
  select role into v_role from public.creed_members
    where creed_id = p_strap_id and user_id = p_user_id for share;
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Publishing skills requires a profile owner or Company admin.' using errcode = '42501';
  end if;
  if p_base_revision is null or p_base_revision < 0 or p_archived is null then
    raise exception 'A valid base revision and archive state are required.' using errcode = '22023';
  end if;
  select * into v_skill from public.strap_skills where strap_id = p_strap_id and name = p_name for update;
  if found then
    if p_base_revision <> v_skill.revision then
      if (p_files is null and p_archived and v_skill.archived)
        or (p_files is not null and p_files = v_skill.files and p_digest = v_skill.digest and p_archived = v_skill.archived) then
        return public.strap_skill_document(v_skill);
      end if;
      raise exception 'The skill changed. Refresh and compare before publishing.' using errcode = 'PT409';
    end if;
    update public.strap_skills set description = coalesce(p_description, description),
      files = coalesce(p_files, files), digest = coalesce(p_digest, digest),
      byte_count = coalesce(p_byte_count, byte_count), archived = p_archived,
      revision = revision + 1, updated_by = p_user_id, updated_at = clock_timestamp()
      where id = v_skill.id returning * into v_skill;
  else
    if p_base_revision <> 0 or p_files is null or p_archived then
      raise exception 'Skill no longer exists. Refresh the library.' using errcode = 'PT409';
    end if;
    if (select count(*) from public.strap_skills where strap_id = p_strap_id) >= 100 then
      raise exception 'This library has reached its 100 skill limit.' using errcode = '54000';
    end if;
    insert into public.strap_skills (strap_id, name, description, revision, digest, files, byte_count, updated_by)
      values (p_strap_id, p_name, p_description, 1, p_digest, p_files, p_byte_count, p_user_id)
      returning * into v_skill;
  end if;
  v_document := public.strap_skill_document(v_skill);
  insert into public.strap_skill_versions(skill_id, revision, document) values (v_skill.id, v_skill.revision, v_document);
  delete from public.strap_skill_versions where skill_id = v_skill.id and revision <= v_skill.revision - 20;

  select coalesce((select sum(storage_bytes) from public.strap_skills where strap_id = p_strap_id), 0)
    + coalesce((select sum(v.storage_bytes) from public.strap_skill_versions v
      join public.strap_skills s on s.id = v.skill_id where s.strap_id = p_strap_id), 0) into v_usage;
  if v_usage > v_limit then
    -- Remove the oldest historical copies first, never a skill's current revision.
    with candidates as (
      select v.skill_id, v.revision, v.storage_bytes,
        sum(v.storage_bytes) over (order by (v.summary->>'updatedAt')::timestamptz, v.skill_id, v.revision) as freed
      from public.strap_skill_versions v join public.strap_skills s on s.id = v.skill_id
      where s.strap_id = p_strap_id and v.revision < s.revision
    )
    delete from public.strap_skill_versions v using candidates c
      where v.skill_id = c.skill_id and v.revision = c.revision
        and c.freed - c.storage_bytes < v_usage - v_limit;
    select coalesce((select sum(storage_bytes) from public.strap_skills where strap_id = p_strap_id), 0)
      + coalesce((select sum(v.storage_bytes) from public.strap_skill_versions v
        join public.strap_skills s on s.id = v.skill_id where s.strap_id = p_strap_id), 0) into v_usage;
    if v_usage > v_limit then
      -- Raising rolls back the publication and all attempted history pruning.
      raise exception 'Library storage is full (64 MiB including history). Reduce files in an existing skill before publishing.' using errcode = '54000';
    end if;
  end if;
  return v_document;
end;
$$;

--
-- Name: strap_skills_read(uuid, uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strap_skills_read(p_user_id uuid, p_strap_id uuid, p_name text DEFAULT NULL::text, p_revision integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_role text;
  v_skill public.strap_skills;
  v_document jsonb;
begin
  perform 1 from public.creeds where id = p_strap_id for share;
  select role into v_role from public.creed_members
    where creed_id = p_strap_id and user_id = p_user_id for share;
  if v_role is null then raise exception 'Skill library access denied.' using errcode = '42501'; end if;
  if p_name is null then
    return jsonb_build_object('strapId', p_strap_id, 'canManage', v_role in ('owner', 'admin'),
      'storageBytes', coalesce((select sum(storage_bytes) from public.strap_skills where strap_id = p_strap_id), 0)
        + coalesce((select sum(v.storage_bytes) from public.strap_skill_versions v
          join public.strap_skills s on s.id = v.skill_id where s.strap_id = p_strap_id), 0),
      'skills',
      coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'strapId', s.strap_id, 'name', s.name,
        'description', s.description, 'revision', s.revision, 'digest', s.digest,
        'fileCount', s.file_count, 'byteCount', s.byte_count,
        'archived', s.archived, 'updatedAt', s.updated_at
      ) order by s.name) from public.strap_skills s where s.strap_id = p_strap_id), '[]'::jsonb));
  end if;
  select * into v_skill from public.strap_skills where strap_id = p_strap_id and name = p_name;
  if not found then raise exception 'Skill not found.' using errcode = 'P0002'; end if;
  if p_revision is null then
    v_document := public.strap_skill_document(v_skill);
  else
    select document into v_document from public.strap_skill_versions where skill_id = v_skill.id and revision = p_revision;
    if not found then raise exception 'Skill version not found.' using errcode = 'P0002'; end if;
  end if;
  return jsonb_build_object('skill', v_document, 'versions',
    coalesce((select jsonb_agg(summary order by revision desc)
      from public.strap_skill_versions where skill_id = v_skill.id), '[]'::jsonb));
end;
$$;

--
-- Name: transfer_creed_ownership(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_creed_ownership(p_creed_id uuid, p_from uuid, p_to uuid) RETURNS void
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO 'public'
    AS $$
declare
  v_count integer;
begin
  if p_creed_id is null or p_from is null or p_to is null then
    raise exception 'creed id, source owner, and target owner are required';
  end if;

  if p_from = p_to then
    raise exception 'target already owns this creed';
  end if;

  if not exists (
    select 1
    from public.creeds c
    where c.id = p_creed_id
      and c.type = 'company'
      and c.owner_user_id = p_from
  ) then
    raise exception 'source user is not the company owner';
  end if;

  if not exists (
    select 1
    from public.creed_members m
    where m.creed_id = p_creed_id
      and m.user_id = p_to
      and m.role in ('admin', 'member')
  ) then
    raise exception 'target user is not an active non-owner member';
  end if;

  update public.creed_members
    set role = 'admin'
    where creed_id = p_creed_id
      and user_id = p_from
      and role = 'owner';

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'expected exactly one outgoing owner, got %', v_count;
  end if;

  update public.creed_members
    set role = 'owner'
    where creed_id = p_creed_id
      and user_id = p_to
      and role in ('admin', 'member');

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'expected exactly one incoming owner, got %', v_count;
  end if;

  update public.creeds
    set owner_user_id = p_to,
        updated_at = timezone('utc'::text, now())
    where id = p_creed_id
      and owner_user_id = p_from;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'expected exactly one creed owner row, got %', v_count;
  end if;

  update public.creed_company_billing
    set owner_user_id = p_to,
        updated_at = timezone('utc'::text, now())
    where creed_id = p_creed_id;
end;
$$;
