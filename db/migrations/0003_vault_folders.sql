CREATE TABLE "strap_vault_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strap_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	CONSTRAINT "strap_vault_folders_strap_id_id_key" UNIQUE("strap_id","id"),
	CONSTRAINT "strap_vault_folders_description_check" CHECK (char_length(description) <= 500),
	CONSTRAINT "strap_vault_folders_name_check" CHECK ((char_length(name) >= 1) AND (char_length(name) <= 120))
);
--> statement-breakpoint
ALTER TABLE "creed_headless_access_keys" ADD COLUMN "vault_folder_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "creed_vault_items" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "strap_vault_folders" ADD CONSTRAINT "strap_vault_folders_strap_id_fkey" FOREIGN KEY ("strap_id") REFERENCES "public"."creeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "strap_vault_folders_name_idx" ON "strap_vault_folders" USING btree (strap_id,lower(name));--> statement-breakpoint
ALTER TABLE "creed_vault_items" ADD CONSTRAINT "creed_vault_items_folder_fkey" FOREIGN KEY ("creed_id","folder_id") REFERENCES "public"."strap_vault_folders"("strap_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creed_vault_items_folder_idx" ON "creed_vault_items" USING btree ("folder_id");--> statement-breakpoint
ALTER TABLE "creed_headless_access_keys" ADD CONSTRAINT "creed_headless_access_keys_vault_folder_ids_check" CHECK (cardinality("creed_headless_access_keys"."vault_folder_ids") <= 100 AND array_position("creed_headless_access_keys"."vault_folder_ids", NULL) IS NULL);