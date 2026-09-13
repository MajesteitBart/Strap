-- Shared skill bundles are independent of profile sections and Vault secrets.
-- Browser sessions and scoped MCP credentials use server-authorized RPCs. No
-- client role receives table access; every RPC rechecks live membership.
create table if not exists public.strap_skills (
  id uuid primary key default gen_random_uuid(),
  strap_id uuid not null references public.creeds(id) on delete cascade,
  name text not null check (length(name) between 1 and 64 and name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (length(description) between 1 and 1024),
  revision integer not null check (revision > 0),
  digest text not null check (digest ~ '^[a-f0-9]{64}$'),
  files jsonb not null check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) between 1 and 128 and octet_length(files::text) <= 12582912),
  byte_count integer not null check (byte_count between 1 and 2097152),
  archived boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (strap_id, name)
);
create index if not exists strap_skills_updated_by_idx on public.strap_skills(updated_by);

create table if not exists public.strap_skill_versions (
  skill_id uuid not null references public.strap_skills(id) on delete cascade,
  revision integer not null check (revision > 0),
  document jsonb not null,
  primary key (skill_id, revision)
);

alter table public.strap_skills enable row level security;
alter table public.strap_skill_versions enable row level security;
revoke all on public.strap_skills, public.strap_skill_versions from public, anon, authenticated;
grant select, insert, update, delete on public.strap_skills, public.strap_skill_versions to service_role;

create or replace function public.strap_skill_document(p_skill public.strap_skills)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p_skill.id, 'strapId', p_skill.strap_id, 'name', p_skill.name,
    'description', p_skill.description, 'revision', p_skill.revision,
    'digest', p_skill.digest, 'files', p_skill.files,
    'fileCount', jsonb_array_length(p_skill.files), 'byteCount', p_skill.byte_count,
    'archived', p_skill.archived, 'updatedAt', p_skill.updated_at
  );
$$;
revoke all on function public.strap_skill_document(public.strap_skills) from public, anon, authenticated;
grant execute on function public.strap_skill_document(public.strap_skills) to service_role;

create or replace function public.strap_skills_read(p_user_id uuid, p_strap_id uuid, p_name text default null, p_revision integer default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_role text;
  v_skill public.strap_skills;
  v_document jsonb;
begin
  -- Shared row locks keep membership/profile removal from interleaving with a read.
  perform 1 from public.creeds where id = p_strap_id for share;
  select role into v_role from public.creed_members
    where creed_id = p_strap_id and user_id = p_user_id for share;
  if v_role is null then raise exception 'Skill library access denied.' using errcode = '42501'; end if;
  if p_name is null then
    return jsonb_build_object('strapId', p_strap_id, 'canManage', v_role in ('owner', 'admin'), 'skills',
      coalesce((select jsonb_agg(public.strap_skill_document(s) - 'files' order by s.name)
        from public.strap_skills s where s.strap_id = p_strap_id), '[]'::jsonb));
  end if;
  select * into v_skill from public.strap_skills where strap_id = p_strap_id and name = p_name;
  if not found then raise exception 'Skill not found.' using errcode = 'P0002'; end if;
  if p_revision is null then
    v_document := public.strap_skill_document(v_skill);
  else
    select document into v_document from public.strap_skill_versions where skill_id = v_skill.id and revision = p_revision;
    if not found then raise exception 'Skill version not found.' using errcode = 'P0002'; end if;
  end if;
  return jsonb_build_object('skill', v_document, 'versions',
    coalesce((select jsonb_agg(document - 'files' order by revision desc)
      from public.strap_skill_versions where skill_id = v_skill.id), '[]'::jsonb));
end;
$$;
revoke all on function public.strap_skills_read(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.strap_skills_read(uuid, uuid, text, integer) to service_role;

create or replace function public.strap_skill_publish(
  p_user_id uuid, p_strap_id uuid, p_name text, p_base_revision integer,
  p_description text default null, p_files jsonb default null,
  p_digest text default null, p_byte_count integer default null, p_archived boolean default false
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_role text;
  v_skill public.strap_skills;
  v_document jsonb;
begin
  -- Serialize publication within a library, including first creates and the cap.
  -- A stale revision never overwrites a concurrent publication or archive.
  perform 1 from public.creeds where id = p_strap_id for update;
  select role into v_role from public.creed_members
    where creed_id = p_strap_id and user_id = p_user_id for share;
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Publishing skills requires a profile owner or Company admin.' using errcode = '42501';
  end if;
  if p_base_revision is null or p_base_revision < 0 or p_archived is null then
    raise exception 'A valid base revision and archive state are required.' using errcode = '22023';
  end if;
  select * into v_skill from public.strap_skills where strap_id = p_strap_id and name = p_name for update;
  if found then
    if p_base_revision <> v_skill.revision then
      -- Safe retry after a lost response: only identical content and state.
      if p_files is not null and p_files = v_skill.files and p_digest = v_skill.digest and p_archived = v_skill.archived then
        return public.strap_skill_document(v_skill);
      end if;
      raise exception 'The skill changed. Refresh and compare before publishing.' using errcode = 'PT409';
    end if;
    update public.strap_skills set description = coalesce(p_description, description),
      files = coalesce(p_files, files), digest = coalesce(p_digest, digest),
      byte_count = coalesce(p_byte_count, byte_count), archived = p_archived,
      revision = revision + 1, updated_by = p_user_id, updated_at = clock_timestamp()
      where id = v_skill.id returning * into v_skill;
  else
    if p_base_revision <> 0 or p_files is null or p_archived then
      raise exception 'Skill no longer exists. Refresh the library.' using errcode = 'PT409';
    end if;
    if (select count(*) from public.strap_skills where strap_id = p_strap_id) >= 100 then
      raise exception 'This library has reached its 100 skill limit.' using errcode = '54000';
    end if;
    insert into public.strap_skills (strap_id, name, description, revision, digest, files, byte_count, updated_by)
      values (p_strap_id, p_name, p_description, 1, p_digest, p_files, p_byte_count, p_user_id)
      returning * into v_skill;
  end if;
  v_document := public.strap_skill_document(v_skill);
  insert into public.strap_skill_versions(skill_id, revision, document) values (v_skill.id, v_skill.revision, v_document);
  -- Keep the most recent 20 complete versions, including the current one.
  delete from public.strap_skill_versions where skill_id = v_skill.id and revision <= v_skill.revision - 20;
  return v_document;
end;
$$;
revoke all on function public.strap_skill_publish(uuid, uuid, text, integer, text, jsonb, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.strap_skill_publish(uuid, uuid, text, integer, text, jsonb, text, integer, boolean) to service_role;
