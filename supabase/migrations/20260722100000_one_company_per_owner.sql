-- Clean databases get the additional unique-index guard. Older databases can
-- contain duplicate company owners from the former create-after-read path; do
-- not abort their migration or delete potentially populated Straps. The
-- transactional provisioning RPC in the follow-up migration serializes all
-- future creates even when this optional index has to be skipped.
do $$
begin
  if exists (
    select 1
    from public.creeds
    where type = 'company'
    group by owner_user_id
    having count(*) > 1
  ) then
    raise notice 'Skipping creeds_one_company_per_owner: duplicate company owners require manual consolidation.';
  else
    create unique index if not exists creeds_one_company_per_owner
      on public.creeds (owner_user_id)
      where type = 'company';
  end if;
end;
$$;
