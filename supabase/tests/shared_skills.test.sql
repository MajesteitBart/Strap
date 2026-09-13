begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(id, email) values
  ('51000000-0000-4000-8000-000000000001', 'skill-owner@example.invalid'),
  ('51000000-0000-4000-8000-000000000002', 'skill-member@example.invalid'),
  ('51000000-0000-4000-8000-000000000003', 'skill-outsider@example.invalid');
insert into public.creeds(id, type, name, owner_user_id) values
  ('52000000-0000-4000-8000-000000000001', 'company', 'Skill test', '51000000-0000-4000-8000-000000000001');
insert into public.creed_members(creed_id, user_id, role) values
  ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'owner'),
  ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000002', 'member');

set local role anon;
select throws_ok($$select * from public.strap_skills$$, '42501', null, 'anon cannot select skills');
select throws_ok($$insert into public.strap_skills(name) values ('nope')$$, '42501', null, 'anon cannot insert skills');
select throws_ok($$update public.strap_skills set name = 'nope'$$, '42501', null, 'anon cannot update skills');
select throws_ok($$delete from public.strap_skills$$, '42501', null, 'anon cannot delete skills');
select throws_ok($$select * from public.strap_skill_versions$$, '42501', null, 'anon cannot read versions');
select throws_ok($$select public.strap_skills_read('51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001')$$, '42501', null, 'anon cannot impersonate a member through RPC');
reset role;

set local role authenticated;
select throws_ok($$select * from public.strap_skills$$, '42501', null, 'browser cannot bypass server authorization');
select throws_ok($$insert into public.strap_skills(name) values ('nope')$$, '42501', null, 'browser cannot insert skills directly');
select throws_ok($$update public.strap_skills set name = 'nope'$$, '42501', null, 'browser cannot update skills directly');
select throws_ok($$delete from public.strap_skills$$, '42501', null, 'browser cannot delete skills directly');
select throws_ok($$select * from public.strap_skill_versions$$, '42501', null, 'browser cannot read versions directly');
select throws_ok($$select public.strap_skill_publish('51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'test', 0)$$, '42501', null, 'browser cannot impersonate the owner');
reset role;

set local role service_role;
select is((public.strap_skill_publish('51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'test', 0, 'Test workflow', '[{"path":"SKILL.md","content":"test","encoding":"utf8","executable":false}]', repeat('a',64), 4)->>'revision')::int, 1, 'owner creates first revision');
select is(jsonb_array_length(public.strap_skills_read('51000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001')->'skills'), 1, 'member reads shared library');
select throws_ok($$select public.strap_skills_read('51000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001')$$, '42501', null, 'outsider cannot read library');
select throws_ok($$select public.strap_skill_publish('51000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', 'test', 1)$$, '42501', null, 'member cannot publish skills');
select is((public.strap_skill_publish('51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'test', 1, 'Changed', '[{"path":"SKILL.md","content":"changed","encoding":"utf8","executable":false}]', repeat('b',64), 7)->>'revision')::int, 2, 'owner publishes next revision');
select throws_ok($$select public.strap_skill_publish('51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'test', 1, 'Stale', '[{"path":"SKILL.md","content":"stale"}]', repeat('c',64), 5)$$, 'PT409', null, 'stale publication cannot overwrite current version');
select is(public.strap_skills_read('51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'test', 1)->'skill'->>'description', 'Test workflow', 'original version remains available');
select is((public.strap_skill_publish('51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'test', 2, p_archived => true)->>'archived')::boolean, true, 'archive leaves a versioned tombstone');
reset role;

update public.creed_members set role = 'admin' where user_id = '51000000-0000-4000-8000-000000000002';
set local role service_role;
select is((public.strap_skill_publish('51000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', 'test', 3, p_archived => false)->>'revision')::int, 4, 'admin may restore a skill');
reset role;
delete from public.creed_members where user_id = '51000000-0000-4000-8000-000000000002';
set local role service_role;
select throws_ok($$select public.strap_skills_read('51000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001')$$, '42501', null, 'removed member loses reads immediately');
select throws_ok($$select public.strap_skill_publish('51000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', 'test', 4)$$, '42501', null, 'removed admin loses publication immediately');
reset role;
select * from finish();
rollback;
