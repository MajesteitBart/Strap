begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users(id, email) values
  ('61000000-0000-4000-8000-000000000001', 'varlock-test@example.invalid');
insert into public.creeds(id, type, name, owner_user_id) values
  ('62000000-0000-4000-8000-000000000001', 'personal', 'Varlock test', '61000000-0000-4000-8000-000000000001');
insert into public.creed_headless_access_keys(id, creed_id, user_id, name, key_prefix, key_hash) values
  ('63000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'Test', 'strap_key_test', repeat('a', 64));

select is((select vault_item_ids from public.creed_headless_access_keys where id = '63000000-0000-4000-8000-000000000001'), '{}'::uuid[], 'context-only keys default to no secret grants');
select ok((select relrowsecurity from pg_class where oid = 'public.creed_headless_access_keys'::regclass), 'key table keeps RLS enabled');

set local role anon;
select throws_ok($$select vault_item_ids from public.creed_headless_access_keys$$, '42501', null, 'anonymous callers cannot read grants');
select throws_ok($$update public.creed_headless_access_keys set vault_item_ids = '{}'$$, '42501', null, 'anonymous callers cannot edit grants');
reset role;
set local role authenticated;
select throws_ok($$select vault_item_ids from public.creed_headless_access_keys$$, '42501', null, 'browser roles cannot read grants directly');
select throws_ok($$update public.creed_headless_access_keys set vault_item_ids = '{}'$$, '42501', null, 'browser roles cannot elevate grants directly');
reset role;

set local role service_role;
select throws_ok($$update public.creed_headless_access_keys set vault_item_ids = array[null]::uuid[]$$, '23514', null, 'null elements are rejected');
select throws_ok($$update public.creed_headless_access_keys set vault_item_ids = array_fill('64000000-0000-4000-8000-000000000001'::uuid, array[101])$$, '23514', null, 'item grant count is bounded');
select lives_ok($$update public.creed_headless_access_keys set vault_item_ids = array['64000000-0000-4000-8000-000000000001']::uuid[]$$, 'server can persist explicit grants');
select is((select cardinality(vault_item_ids) from public.creed_headless_access_keys where id = '63000000-0000-4000-8000-000000000001'), 1, 'explicit grant is retained');
reset role;
select * from finish();
rollback;
