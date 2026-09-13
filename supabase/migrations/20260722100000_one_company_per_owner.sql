-- Company creation is idempotent per owner. The application retries a
-- conflicting insert by loading the winner, while this partial unique index
-- closes the create-after-read race at the database boundary.
create unique index if not exists creeds_one_company_per_owner
  on public.creeds (owner_user_id)
  where type = 'company';
