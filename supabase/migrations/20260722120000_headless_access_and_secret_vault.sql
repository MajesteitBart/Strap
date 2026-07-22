-- Headless MCP authentication, OAuth device authorization, and a Creed-scoped
-- API-key vault. All credential and device-code lookups use SHA-256 hashes.
-- Vault plaintext is reachable only through service-role-only definer RPCs.

create extension if not exists supabase_vault with schema vault;

-- Distinguish truly legacy OAuth tokens from modern tokens whose explicit
-- Creed grant insert failed or later became inaccessible. Only the former may
-- use the historical personal-Creed fallback.
alter table public.oauth_tokens
  add column if not exists creed_grants_explicit boolean not null default false;
update public.oauth_tokens t
set creed_grants_explicit = true
where exists (
  select 1 from public.oauth_token_creeds g where g.token_id = t.id
);

-- Long-lived, one-time-visible credentials for headless MCP clients.
create table if not exists public.creed_headless_access_keys (
  id uuid primary key default gen_random_uuid(),
  creed_id uuid not null references public.creeds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  key_prefix text not null check (char_length(key_prefix) between 8 and 32),
  key_hash text not null,
  mode text not null default 'proposal-only'
    check (mode in ('read-only', 'proposal-only', 'direct')),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists creed_headless_access_keys_hash_idx
  on public.creed_headless_access_keys (key_hash);
create index if not exists creed_headless_access_keys_user_creed_idx
  on public.creed_headless_access_keys (user_id, creed_id, created_at desc);

alter table public.creed_headless_access_keys enable row level security;
revoke all on table public.creed_headless_access_keys from public, anon, authenticated;
grant all on table public.creed_headless_access_keys to service_role;

-- RFC 8628 device authorization requests. Device/user code plaintext is never
-- stored. Poll timing and state transitions live in Postgres so multiple app
-- instances enforce one shared single-use contract.
create table if not exists public.oauth_device_authorizations (
  id uuid primary key default gen_random_uuid(),
  device_code_hash text not null,
  user_code_hash text not null,
  client_id text not null references public.oauth_clients(client_id) on delete cascade,
  scope text not null default 'read propose',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'consumed')),
  user_id uuid references auth.users(id) on delete cascade,
  creed_id uuid references public.creeds(id) on delete cascade,
  mode text check (mode in ('read-only', 'proposal-only', 'direct')),
  verification_attempts integer not null default 0 check (verification_attempts between 0 and 10),
  interval_seconds integer not null default 5 check (interval_seconds between 5 and 300),
  next_poll_at timestamptz not null default timezone('utc'::text, now()),
  expires_at timestamptz not null,
  approved_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists oauth_device_authorizations_device_hash_idx
  on public.oauth_device_authorizations (device_code_hash);
create unique index if not exists oauth_device_authorizations_user_hash_idx
  on public.oauth_device_authorizations (user_code_hash)
  where status = 'pending';
create index if not exists oauth_device_authorizations_expiry_idx
  on public.oauth_device_authorizations (expires_at)
  where status in ('pending', 'approved');

alter table public.oauth_device_authorizations enable row level security;
revoke all on table public.oauth_device_authorizations from public, anon, authenticated;
grant all on table public.oauth_device_authorizations to service_role;

-- Atomic device-token poll. Pending polls move the durable next-poll deadline;
-- early polls increase the interval by the RFC-required five seconds. Approved
-- requests are consumed in the same locked transaction that returns grants.
create or replace function public.consume_oauth_device_authorization(
  p_device_code_hash text,
  p_client_id text
)
returns table (
  outcome text,
  authorized_user_id uuid,
  authorized_scope text,
  authorized_creed_id uuid,
  authorized_mode text,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.consume_oauth_device_authorization(text, text) from public, anon, authenticated;
grant execute on function public.consume_oauth_device_authorization(text, text) to service_role;

-- Records a submitted valid user code and hard-denies an authorization after
-- ten submissions. Unknown codes deliberately return no row.
create or replace function public.record_oauth_device_verification(
  p_user_code_hash text
)
returns table (
  request_id uuid,
  requesting_client_id text,
  requested_scope text
)
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.record_oauth_device_verification(text) from public, anon, authenticated;
grant execute on function public.record_oauth_device_verification(text) to service_role;

-- Application-owned metadata for secrets whose payload lives in Vault.
create table if not exists public.creed_vault_items (
  id uuid primary key default gen_random_uuid(),
  creed_id uuid not null references public.creeds(id) on delete cascade,
  vault_secret_id uuid not null unique,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  last_accessed_at timestamptz
);

create unique index if not exists creed_vault_items_name_idx
  on public.creed_vault_items (creed_id, lower(name));
create index if not exists creed_vault_items_creed_created_idx
  on public.creed_vault_items (creed_id, created_at desc);

alter table public.creed_vault_items enable row level security;
revoke all on table public.creed_vault_items from public, anon, authenticated;
grant all on table public.creed_vault_items to service_role;

create or replace function public.creed_vault_create_secret(
  p_creed_id uuid,
  p_created_by uuid,
  p_name text,
  p_description text,
  p_secret text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_id uuid := gen_random_uuid();
  v_vault_id uuid;
begin
  v_vault_id := vault.create_secret(
    p_secret,
    'creed_' || replace(v_item_id::text, '-', ''),
    'Managed by Creed'
  );

  insert into public.creed_vault_items (
    id, creed_id, vault_secret_id, name, description, created_by
  ) values (
    v_item_id, p_creed_id, v_vault_id, p_name, coalesce(p_description, ''), p_created_by
  );
  return v_item_id;
end;
$$;

create or replace function public.creed_vault_reveal_secret(p_item_id uuid)
returns table (
  item_id uuid,
  item_name text,
  item_description text,
  secret_value text,
  item_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.creed_vault_items
    set last_accessed_at = timezone('utc'::text, now())
    where id = p_item_id;

  return query
    select i.id, i.name, i.description, d.decrypted_secret, i.updated_at
    from public.creed_vault_items i
    join vault.decrypted_secrets d on d.id = i.vault_secret_id
    where i.id = p_item_id;
end;
$$;

create or replace function public.creed_vault_update_secret(
  p_item_id uuid,
  p_name text,
  p_description text,
  p_secret text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vault_id uuid;
begin
  select vault_secret_id into v_vault_id
  from public.creed_vault_items
  where id = p_item_id
  for update;
  if not found then return false; end if;

  if p_secret is not null then
    perform vault.update_secret(v_vault_id, p_secret);
  end if;

  update public.creed_vault_items
    set name = p_name,
        description = coalesce(p_description, ''),
        updated_at = timezone('utc'::text, now())
    where id = p_item_id;
  return true;
end;
$$;

create or replace function public.creed_vault_delete_secret(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vault_id uuid;
begin
  select vault_secret_id into v_vault_id
  from public.creed_vault_items
  where id = p_item_id
  for update;
  if not found then return false; end if;

  delete from vault.secrets where id = v_vault_id;
  delete from public.creed_vault_items where id = p_item_id;
  return true;
end;
$$;

revoke all on function public.creed_vault_create_secret(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.creed_vault_reveal_secret(uuid) from public, anon, authenticated;
revoke all on function public.creed_vault_update_secret(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.creed_vault_delete_secret(uuid) from public, anon, authenticated;
grant execute on function public.creed_vault_create_secret(uuid, uuid, text, text, text) to service_role;
grant execute on function public.creed_vault_reveal_secret(uuid) to service_role;
grant execute on function public.creed_vault_update_secret(uuid, text, text, text) to service_role;
grant execute on function public.creed_vault_delete_secret(uuid) to service_role;
