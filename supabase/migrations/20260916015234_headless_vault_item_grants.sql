-- Existing headless keys remain context-only. Only explicitly selected immutable
-- item IDs may be revealed; names and newly created items cannot expand a grant.
alter table public.creed_headless_access_keys
  add column if not exists vault_item_ids uuid[] not null default '{}'
  check (cardinality(vault_item_ids) <= 100 and array_position(vault_item_ids, null) is null);

-- Keep credential grants entirely server-managed, including on older installs.
revoke all on table public.creed_headless_access_keys from public, anon, authenticated;
grant all on table public.creed_headless_access_keys to service_role;
