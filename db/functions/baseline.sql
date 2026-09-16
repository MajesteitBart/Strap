--
-- Name: consume_oauth_device_authorization(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_oauth_device_authorization(p_device_code_hash text, p_client_id text) RETURNS TABLE(outcome text, authorized_user_id uuid, authorized_scope text, authorized_creed_id uuid, authorized_mode text, retry_after_seconds integer)
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO ''
    AS $$
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

--
-- Name: increment_mcp_read_for_creed(uuid, uuid, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_mcp_read_for_creed(p_creed_id uuid, p_reader_user_id uuid, p_client_id text, p_day date) RETURNS void
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO 'public'
    AS $$
begin
  if p_creed_id is null or p_reader_user_id is null then
    raise exception 'creed id and reader user id are required';
  end if;

  if not exists (
    select 1
    from public.creed_members
    where creed_id = p_creed_id
      and user_id = p_reader_user_id
  ) then
    raise exception 'reader is not an active member of this creed';
  end if;

  insert into public.creed_mcp_read_events (creed_id, user_id, client_id, day, read_count)
  values (p_creed_id, p_reader_user_id, p_client_id, p_day, 1)
  on conflict (creed_id, client_id, day)
  do update set
    read_count = public.creed_mcp_read_events.read_count + 1,
    updated_at = timezone('utc'::text, now());
end;
$$;

--
-- Name: provision_company_creed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.provision_company_creed(p_owner uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO ''
    AS $$
declare
  v_creed_id uuid;
begin
  if p_owner is null then
    raise exception 'Company owner is required' using errcode = '22004';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('strap:company:' || p_owner::text, 0)
  );

  select id into v_creed_id
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

--
-- Name: record_oauth_device_verification(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_oauth_device_verification(p_user_code_hash text) RETURNS TABLE(request_id uuid, requesting_client_id text, requested_scope text)
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO ''
    AS $$
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




--
-- Name: strap_skill_document(public.strap_skills); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strap_skill_document(p_skill public.strap_skills) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select jsonb_build_object(
    'id', p_skill.id, 'strapId', p_skill.strap_id, 'name', p_skill.name,
    'description', p_skill.description, 'revision', p_skill.revision,
    'digest', p_skill.digest, 'files', p_skill.files,
    'fileCount', jsonb_array_length(p_skill.files), 'byteCount', p_skill.byte_count,
    'archived', p_skill.archived, 'updatedAt', p_skill.updated_at
  );
$$;

--
-- Name: strap_skill_publish(uuid, uuid, text, integer, text, jsonb, text, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strap_skill_publish(p_user_id uuid, p_strap_id uuid, p_name text, p_base_revision integer, p_description text DEFAULT NULL::text, p_files jsonb DEFAULT NULL::jsonb, p_digest text DEFAULT NULL::text, p_byte_count integer DEFAULT NULL::integer, p_archived boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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

--
-- Name: strap_skills_read(uuid, uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.strap_skills_read(p_user_id uuid, p_strap_id uuid, p_name text DEFAULT NULL::text, p_revision integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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

--
-- Name: transfer_creed_ownership(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_creed_ownership(p_creed_id uuid, p_from uuid, p_to uuid) RETURNS void
    LANGUAGE plpgsql SECURITY INVOKER
    SET search_path TO 'public'
    AS $$
declare
  v_count integer;
begin
  if p_creed_id is null or p_from is null or p_to is null then
    raise exception 'creed id, source owner, and target owner are required';
  end if;

  if p_from = p_to then
    raise exception 'target already owns this creed';
  end if;

  if not exists (
    select 1
    from public.creeds c
    where c.id = p_creed_id
      and c.type = 'company'
      and c.owner_user_id = p_from
  ) then
    raise exception 'source user is not the company owner';
  end if;

  if not exists (
    select 1
    from public.creed_members m
    where m.creed_id = p_creed_id
      and m.user_id = p_to
      and m.role in ('admin', 'member')
  ) then
    raise exception 'target user is not an active non-owner member';
  end if;

  update public.creed_members
    set role = 'admin'
    where creed_id = p_creed_id
      and user_id = p_from
      and role = 'owner';

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'expected exactly one outgoing owner, got %', v_count;
  end if;

  update public.creed_members
    set role = 'owner'
    where creed_id = p_creed_id
      and user_id = p_to
      and role in ('admin', 'member');

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'expected exactly one incoming owner, got %', v_count;
  end if;

  update public.creeds
    set owner_user_id = p_to,
        updated_at = timezone('utc'::text, now())
    where id = p_creed_id
      and owner_user_id = p_from;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'expected exactly one creed owner row, got %', v_count;
  end if;

  update public.creed_company_billing
    set owner_user_id = p_to,
        updated_at = timezone('utc'::text, now())
    where creed_id = p_creed_id;
end;
$$;
