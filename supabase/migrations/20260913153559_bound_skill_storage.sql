-- Cache small metadata separately from TOASTed bundles. Keep current data and
-- retained history within one serialized 64 MiB library budget.
alter table public.strap_skills
  add column if not exists file_count integer generated always as (jsonb_array_length(files)) stored,
  add column if not exists storage_bytes integer generated always as (octet_length(files::text)) stored;
alter table public.strap_skill_versions
  add column if not exists summary jsonb generated always as (document - 'files') stored,
  add column if not exists storage_bytes integer generated always as (octet_length(document::text)) stored;

create or replace function public.strap_skills_read(p_user_id uuid, p_strap_id uuid, p_name text default null, p_revision integer default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_role text;
  v_skill public.strap_skills;
  v_document jsonb;
begin
  perform 1 from public.creeds where id = p_strap_id for share;
  select role into v_role from public.creed_members
    where creed_id = p_strap_id and user_id = p_user_id for share;
  if v_role is null then raise exception 'Skill library access denied.' using errcode = '42501'; end if;
  if p_name is null then
    return jsonb_build_object('strapId', p_strap_id, 'canManage', v_role in ('owner', 'admin'),
      'storageBytes', coalesce((select sum(storage_bytes) from public.strap_skills where strap_id = p_strap_id), 0)
        + coalesce((select sum(v.storage_bytes) from public.strap_skill_versions v
          join public.strap_skills s on s.id = v.skill_id where s.strap_id = p_strap_id), 0),
      'skills',
      coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'strapId', s.strap_id, 'name', s.name,
        'description', s.description, 'revision', s.revision, 'digest', s.digest,
        'fileCount', s.file_count, 'byteCount', s.byte_count,
        'archived', s.archived, 'updatedAt', s.updated_at
      ) order by s.name) from public.strap_skills s where s.strap_id = p_strap_id), '[]'::jsonb));
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
    coalesce((select jsonb_agg(summary order by revision desc)
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
  v_usage bigint;
  v_limit constant bigint := 67108864;
begin
  -- This profile lock serializes both revisions and aggregate storage accounting.
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
      if (p_files is null and p_archived and v_skill.archived)
        or (p_files is not null and p_files = v_skill.files and p_digest = v_skill.digest and p_archived = v_skill.archived) then
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
  delete from public.strap_skill_versions where skill_id = v_skill.id and revision <= v_skill.revision - 20;

  select coalesce((select sum(storage_bytes) from public.strap_skills where strap_id = p_strap_id), 0)
    + coalesce((select sum(v.storage_bytes) from public.strap_skill_versions v
      join public.strap_skills s on s.id = v.skill_id where s.strap_id = p_strap_id), 0) into v_usage;
  if v_usage > v_limit then
    -- Remove the oldest historical copies first, never a skill's current revision.
    with candidates as (
      select v.skill_id, v.revision, v.storage_bytes,
        sum(v.storage_bytes) over (order by (v.summary->>'updatedAt')::timestamptz, v.skill_id, v.revision) as freed
      from public.strap_skill_versions v join public.strap_skills s on s.id = v.skill_id
      where s.strap_id = p_strap_id and v.revision < s.revision
    )
    delete from public.strap_skill_versions v using candidates c
      where v.skill_id = c.skill_id and v.revision = c.revision
        and c.freed - c.storage_bytes < v_usage - v_limit;
    select coalesce((select sum(storage_bytes) from public.strap_skills where strap_id = p_strap_id), 0)
      + coalesce((select sum(v.storage_bytes) from public.strap_skill_versions v
        join public.strap_skills s on s.id = v.skill_id where s.strap_id = p_strap_id), 0) into v_usage;
    if v_usage > v_limit then
      -- Raising rolls back the publication and all attempted history pruning.
      raise exception 'Library storage is full (64 MiB including history). Reduce files in an existing skill before publishing.' using errcode = '54000';
    end if;
  end if;
  return v_document;
end;
$$;
revoke all on function public.strap_skill_publish(uuid, uuid, text, integer, text, jsonb, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.strap_skill_publish(uuid, uuid, text, integer, text, jsonb, text, integer, boolean) to service_role;
