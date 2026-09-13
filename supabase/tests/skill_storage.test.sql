begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
insert into auth.users(id,email) values ('53000000-0000-4000-8000-000000000001','quota-owner@example.invalid');
insert into public.creeds(id,type,name,owner_user_id) values
  ('54000000-0000-4000-8000-000000000001','personal','Quota test','53000000-0000-4000-8000-000000000001');
insert into public.creed_members(creed_id,user_id,role) values
  ('54000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000001','owner');

set local role service_role;
do $$
declare
  files jsonb := (select jsonb_agg(jsonb_build_object('path',case when n=1 then 'SKILL.md' else 'asset-'||n||'.txt' end,'content',repeat('x',523264),'encoding','utf8','executable',false)) from generate_series(1,4) n);
begin
  for skill in 1..2 loop
    for revision in 0..19 loop
      perform public.strap_skill_publish('53000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001',
        'large-'||skill,revision,'Large skill',files,repeat('a',64),2093056);
    end loop;
  end loop;
end;
$$;
select ok((select sum(storage_bytes) from public.strap_skills) + (select sum(storage_bytes) from public.strap_skill_versions) <= 67108864,
  'current bundles and retained documents fit the encoded storage budget');
select ok((select count(*) from public.strap_skill_versions) < 40,'old history is pruned when the library budget is reached');
select is((select count(*)::int from public.strap_skills s join public.strap_skill_versions v on v.skill_id=s.id and v.revision=s.revision),2,
  'every current revision remains available after pruning');
select is(jsonb_array_length(public.strap_skills_read('53000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001')->'skills'),2,
  'large library still returns both summaries');
select ok(not exists(select 1 from jsonb_array_elements(public.strap_skills_read('53000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001')->'skills') item where item ? 'files'),
  'library summaries contain no file payload');
select ok(not exists(select 1 from public.strap_skill_versions where summary ? 'files' or octet_length(summary::text)>2048),
  'history summaries remain small with multi-megabyte documents');
select is((public.strap_skills_read('53000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001')->>'storageBytes')::bigint,
  ((select sum(storage_bytes) from public.strap_skills) + (select sum(storage_bytes) from public.strap_skill_versions))::bigint,
  'library reports the same storage usage that publication enforces');
do $$
declare
  files jsonb := (select jsonb_agg(jsonb_build_object('path',case when n=1 then 'SKILL.md' else 'asset-'||n||'.txt' end,'content',repeat('x',523264),'encoding','utf8','executable',false)) from generate_series(1,4) n);
begin
  for skill in 3..16 loop
    perform public.strap_skill_publish('53000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001',
      'large-'||skill,0,'Large skill',files,repeat('a',64),2093056);
  end loop;
end;
$$;
select throws_ok($$select public.strap_skill_publish('53000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001',
 'large-17',0,'Large skill',(select jsonb_agg(jsonb_build_object('path',case when n=1 then 'SKILL.md' else 'asset-'||n||'.txt' end,'content',repeat('x',523264),'encoding','utf8','executable',false)) from generate_series(1,4) n),repeat('a',64),2093056)$$,
 '54000',null,'current data cannot grow beyond the profile storage quota');
select is((select count(*)::int from public.strap_skills),16,'quota rejection rolls back the new skill');
select is((public.strap_skill_publish('53000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001','large-1',20,p_archived=>true)->>'revision')::int,21,
 'archiving still works at capacity by pruning the superseded historical copy');
reset role;
select * from finish();
rollback;
