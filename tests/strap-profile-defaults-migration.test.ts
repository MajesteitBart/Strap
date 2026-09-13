import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260724120000_strap_profile_defaults.sql",
    import.meta.url,
  ),
  "utf8",
);

test("new Personal and Company GitHub paths default to strap.md", () => {
  assert.match(
    migration,
    /alter table public\.creed_version_control\s+alter column path set default 'strap\.md'/,
  );
  assert.match(
    migration,
    /alter table public\.creed_company_version_control\s+alter column path set default 'strap\.md'/,
  );
});

test("untouched historical fallback names migrate without rewriting edited names", () => {
  assert.match(migration, /name = 'Your Strap'/);
  assert.match(migration, /name = 'Your Creed'/);
  assert.match(migration, /created_at = updated_at/);
  assert.match(migration, /where type = 'personal'/);
});

test("future Vault descriptions use Strap and preserve the service-role boundary", () => {
  assert.match(migration, /'Managed by Strap'/);
  assert.doesNotMatch(migration, /'Managed by Creed'/);
  assert.match(
    migration,
    /revoke all on function public\.creed_vault_create_secret\(uuid, uuid, text, text, text\)[\s\S]+from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.creed_vault_create_secret\(uuid, uuid, text, text, text\)[\s\S]+to service_role/,
  );
});
