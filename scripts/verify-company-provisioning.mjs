// Run only against a disposable local Supabase: node scripts/verify-company-provisioning.mjs <container>.
import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const run = promisify(execFile);
const container = process.argv[2];
if (!container || !/^supabase_db_strap-release-[a-z0-9-]+$/.test(container)) {
  throw new Error("Select the disposable strap-release Supabase container explicitly.");
}
const owner = randomUUID();
const failedOwner = randomUUID();
async function sql(query) {
  const { stdout } = await run("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", query]);
  return stdout.trim();
}

await sql(`insert into auth.users (id, email) values
  ('${owner}', '${owner}@example.invalid'), ('${failedOwner}', '${failedOwner}@example.invalid');`);
try {
  assert.equal(await sql("select has_function_privilege('anon', 'public.provision_company_creed(uuid)', 'execute'), has_function_privilege('authenticated', 'public.provision_company_creed(uuid)', 'execute'), has_function_privilege('service_role', 'public.provision_company_creed(uuid)', 'execute');"), "f|f|t");
  const ids = await Promise.all(Array.from({ length: 8 }, () => sql(`select public.provision_company_creed('${owner}');`)));
  assert.equal(new Set(ids).size, 1, "concurrent requests return the same company");
  assert.equal(await sql(`select count(*) from public.creeds where owner_user_id = '${owner}' and type = 'company';`), "1");
  assert.equal(await sql(`select count(*) from public.creed_members where creed_id = '${ids[0]}' and user_id = '${owner}' and role = 'owner';`), "1");
  await sql(`begin;
    create function pg_temp.reject_test_membership() returns trigger language plpgsql as $$
    begin
      if new.user_id = '${failedOwner}'::uuid then raise exception 'fixture membership failure'; end if;
      return new;
    end; $$;
    create trigger strap_test_membership_failure before insert on public.creed_members
      for each row execute function pg_temp.reject_test_membership();
    do $$ begin
      begin
        perform public.provision_company_creed('${failedOwner}');
        raise exception 'Expected membership failure';
      exception when others then
        if sqlerrm <> 'fixture membership failure' then raise; end if;
      end;
      if exists (select 1 from public.creeds where owner_user_id = '${failedOwner}' and type = 'company') then
        raise exception 'Partial company survived the membership failure';
      end if;
    end; $$;
    rollback;`);
  process.stdout.write("Company provisioning passed: restricted RPC grants, eight concurrent retries, owner membership, and transaction rollback.\n");
} finally {
  await sql(`delete from public.creeds where owner_user_id in ('${owner}', '${failedOwner}');
    delete from auth.users where id in ('${owner}', '${failedOwner}');`);
}
