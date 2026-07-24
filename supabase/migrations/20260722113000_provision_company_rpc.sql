-- Serialize company provisioning per owner without relying on a unique index.
-- This keeps deployments with historical duplicate owners migratable while
-- ensuring concurrent requests can never create another duplicate.
create or replace function public.provision_company_creed(p_owner uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creed_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));

  select id
    into v_creed_id
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

revoke all on function public.provision_company_creed(uuid)
  from public, anon, authenticated;
grant execute on function public.provision_company_creed(uuid) to service_role;
