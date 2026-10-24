-- Phase 1.5: live song requests during Song Service (CLAUDE.md, "Phase 1.5").
--
-- Flow: an admin names the chorister of the day (name + phone) when making
-- the week's programme, then taps Start Song Service on the day. While the
-- session is live, followers request hymns by number; the chorister (or an
-- admin) works the list: Next → "Now singing", Sung, or "We'll sing it next
-- time". The session closes when ended or when its time runs out.
--
-- Access: the song tables have no Data API grants. Everything goes through
-- the functions below, which check the caller themselves, so requester names
-- reach only the chorister and the church's programme admins. Choristers,
-- hymnals and hymns are ordinary tables under RLS.

-- ---------------------------------------------------------------- settings
-- A church can switch song requests off.
alter table public.churches add column song_requests boolean not null default true;
grant update (song_requests) on public.churches to authenticated;

-- ---------------------------------------------------------------- choristers
-- The chorister of the day, one per church per Sabbath. The phone links the
-- person to their account: whoever signs in with it leads that Sabbath's
-- session while it is live. It is cleared when that person deletes their
-- account; the name stays, like names in the programme.
create table public.choristers (
  church_id    uuid not null references public.churches (id) on delete cascade,
  sabbath_date date not null,
  name         text not null check (length(btrim(name)) between 1 and 80),
  phone        text check (phone ~ '^\+254[17]\d{8}$'),
  updated_at   timestamptz not null default now(),
  primary key (church_id, sabbath_date)
);
create index choristers_phone_idx on public.choristers (phone) where phone is not null;
alter table public.choristers enable row level security;

create policy "programme admins read choristers" on public.choristers for select to authenticated
  using (private.has_capability(church_id, 'programme.edit'));
create policy "programme admins add choristers" on public.choristers for insert to authenticated
  with check (private.has_capability(church_id, 'programme.edit'));
create policy "programme admins change choristers" on public.choristers for update to authenticated
  using (private.has_capability(church_id, 'programme.edit'))
  with check (private.has_capability(church_id, 'programme.edit'));
create policy "programme admins remove choristers" on public.choristers for delete to authenticated
  using (private.has_capability(church_id, 'programme.edit'));

revoke all on public.choristers from anon, authenticated;
grant select, insert (church_id, sabbath_date, name, phone), update (name, phone, updated_at), delete
  on public.choristers to authenticated;

-- ---------------------------------------------------------------- hymnals
-- Only hymn numbers, titles and hymnal names are stored: no lyrics or music.
create table public.hymnals (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references public.churches (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 60),
  language   text not null default 'en' check (language in ('en', 'sw', 'other')),
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index hymnals_church_idx on public.hymnals (church_id, position);

create table public.hymns (
  hymnal_id uuid not null references public.hymnals (id) on delete cascade,
  number    int not null check (number between 1 and 2000),
  title     text not null check (length(btrim(title)) between 1 and 120),
  primary key (hymnal_id, number)
);

alter table public.hymnals enable row level security;
alter table public.hymns   enable row level security;

create policy "hymnals are public" on public.hymnals for select to anon, authenticated using (true);
create policy "programme admins add hymnals" on public.hymnals for insert to authenticated
  with check (private.has_capability(church_id, 'programme.edit'));
create policy "programme admins change hymnals" on public.hymnals for update to authenticated
  using (private.has_capability(church_id, 'programme.edit'))
  with check (private.has_capability(church_id, 'programme.edit'));
create policy "programme admins remove hymnals" on public.hymnals for delete to authenticated
  using (private.has_capability(church_id, 'programme.edit'));

create policy "hymns are public" on public.hymns for select to anon, authenticated using (true);
create policy "programme admins add hymns" on public.hymns for insert to authenticated
  with check (exists (select 1 from public.hymnals h where h.id = hymnal_id
                      and private.has_capability(h.church_id, 'programme.edit')));
create policy "programme admins change hymns" on public.hymns for update to authenticated
  using (exists (select 1 from public.hymnals h where h.id = hymnal_id
                 and private.has_capability(h.church_id, 'programme.edit')))
  with check (exists (select 1 from public.hymnals h where h.id = hymnal_id
                      and private.has_capability(h.church_id, 'programme.edit')));
create policy "programme admins remove hymns" on public.hymns for delete to authenticated
  using (exists (select 1 from public.hymnals h where h.id = hymnal_id
                 and private.has_capability(h.church_id, 'programme.edit')));

revoke all on public.hymnals, public.hymns from anon, authenticated;
grant select on public.hymnals, public.hymns to anon, authenticated;
grant insert (church_id, name, language, position), update (name, language, position), delete
  on public.hymnals to authenticated;
grant insert, update (title), delete on public.hymns to authenticated;

-- ---------------------------------------------------------------- sessions
-- At most one session per church per Sabbath; ending and starting again
-- reopens it. It counts as live only while status = 'live' and closes_at is
-- in the future, so a forgotten session closes by itself.
create table public.song_sessions (
  id            uuid primary key default gen_random_uuid(),
  church_id     uuid not null references public.churches (id) on delete cascade,
  sabbath_date  date not null,
  status        text not null default 'live' check (status in ('live', 'closed')),
  accepting     boolean not null default true,
  request_limit int not null default 2 check (request_limit between 1 and 10),
  started_at    timestamptz not null default now(),
  started_by    uuid references auth.users (id) on delete set null,
  closes_at     timestamptz not null,
  ended_at      timestamptz,
  updated_at    timestamptz not null default now(),
  unique (church_id, sabbath_date)
);
create index song_sessions_started_by_idx on public.song_sessions (started_by);

-- user_id is null for requests the chorister adds for members without
-- smartphones, and after the requester deletes their account.
create table public.song_requests (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.song_sessions (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  manual      boolean not null default false,
  hymnal_id   uuid references public.hymnals (id) on delete set null,
  hymn_number int check (hymn_number between 1 and 2000),
  title       text check (length(btrim(title)) between 1 and 120),
  anonymous   boolean not null default false,
  status      text not null default 'requested' check (status in ('requested', 'next', 'sung', 'deferred')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (hymn_number is not null or title is not null)
);
create index song_requests_session_idx on public.song_requests (session_id, created_at);
create index song_requests_user_idx on public.song_requests (user_id);
create index song_requests_hymnal_idx on public.song_requests (hymnal_id);

alter table public.song_sessions enable row level security;
alter table public.song_requests enable row level security;
-- No policies and no grants: read and written only through the functions below.
revoke all on public.song_sessions, public.song_requests from anon, authenticated;

-- ---------------------------------------------------------------- helpers
-- "YYYY-MM-DD" of the coming Sabbath in Nairobi (today on a Saturday).
-- Mirrors nextSabbath() in src/lib/time.ts.
create function private.next_sabbath() returns date
  language sql stable set search_path = '' as $$
  select d + ((6 - extract(dow from d)::int + 7) % 7)
  from (select (now() at time zone 'Africa/Nairobi')::date as d) x;
$$;

-- Is the caller the chorister of the day for this church and Sabbath?
create function private.is_chorister(p_church uuid, p_date date) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.choristers c
    join public.profiles p on p.phone = c.phone
    where c.church_id = p_church and c.sabbath_date = p_date and p.id = (select auth.uid())
  );
$$;

-- Locks and returns the session if the caller may lead it: a programme admin
-- of the church at any time, the chorister of the day only while it is live.
create function private.require_song_leader(p_session uuid) returns public.song_sessions
  language plpgsql security definer set search_path = '' as $$
declare
  v_s public.song_sessions;
begin
  select * into v_s from public.song_sessions where id = p_session for update;
  if not found then
    raise exception 'No such Song Service' using errcode = 'P0002';
  end if;
  if private.has_capability(v_s.church_id, 'programme.edit') then
    return v_s;
  end if;
  if v_s.status = 'live' and v_s.closes_at > now()
     and private.is_chorister(v_s.church_id, v_s.sabbath_date) then
    return v_s;
  end if;
  raise exception 'Only the chorister of the day or a church admin can do this' using errcode = '42501';
end;
$$;

revoke all on function private.next_sabbath(), private.is_chorister(uuid, date),
  private.require_song_leader(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- read
-- Everything a screen needs in one call. Requester names are included only
-- for people who may lead; anonymous requests never carry a name.
create function public.song_service_view(p_church uuid) returns jsonb
  language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid       uuid := (select auth.uid());
  v_date      date := private.next_sabbath();
  v_enabled   boolean;
  v_s         public.song_sessions;
  v_live      boolean := false;
  v_admin     boolean;
  v_chorister boolean;
  v_lead      boolean;
  v_request   boolean;
  v_queue     jsonb;
  v_mine      jsonb;
  v_hymnals   jsonb;
begin
  select c.song_requests into v_enabled from public.churches c
   where c.id = p_church and c.status in ('verified', 'pending');
  if not found then
    return null;
  end if;

  select * into v_s from public.song_sessions s where s.church_id = p_church and s.sabbath_date = v_date;
  v_live := found and v_s.status = 'live' and v_s.closes_at > now();

  v_admin := private.has_capability(p_church, 'programme.edit');
  v_chorister := v_uid is not null and private.is_chorister(p_church, v_date);
  v_lead := v_admin or (v_chorister and v_live);
  v_request := v_uid is not null and (
    v_chorister or private.is_church_admin(p_church)
    or exists (select 1 from public.follows f where f.user_id = v_uid and f.church_id = p_church));

  -- The same hymn requested by several people is one row ("requested by 5").
  select coalesce(jsonb_agg(g order by g ->> 'firstAt'), '[]'::jsonb) into v_queue
  from (
    select jsonb_build_object(
      'hymnalId', r.hymnal_id,
      'number', r.hymn_number,
      'title', coalesce(max(h.title), max(r.title)),
      'status', r.status,
      'count', count(*),
      'ids', jsonb_agg(r.id order by r.created_at),
      'firstAt', min(r.created_at),
      'requesters', case when v_lead then jsonb_agg(jsonb_build_object(
          'name', case when r.anonymous then null else nullif(btrim(p.name), '') end,
          'anonymous', r.anonymous,
          'manual', r.manual) order by r.created_at) end
    ) as g
    from public.song_requests r
    left join public.hymns h on h.hymnal_id = r.hymnal_id and h.number = r.hymn_number
    left join public.profiles p on p.id = r.user_id
    where r.session_id = v_s.id
    group by r.hymnal_id, r.hymn_number,
             case when r.hymn_number is null then lower(btrim(r.title)) end, r.status
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'hymnalId', r.hymnal_id, 'number', r.hymn_number,
      'title', coalesce(h.title, r.title), 'status', r.status, 'anonymous', r.anonymous)
    order by r.created_at), '[]'::jsonb) into v_mine
  from public.song_requests r
  left join public.hymns h on h.hymnal_id = r.hymnal_id and h.number = r.hymn_number
  where v_uid is not null and r.session_id = v_s.id and r.user_id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', hy.id, 'name', hy.name, 'language', hy.language,
      'hymns', (select count(*) from public.hymns h where h.hymnal_id = hy.id))
    order by hy.position, hy.created_at), '[]'::jsonb) into v_hymnals
  from public.hymnals hy where hy.church_id = p_church;

  return jsonb_build_object(
    'enabled', v_enabled,
    'sabbathDate', v_date,
    'chorister', (select c.name from public.choristers c
                   where c.church_id = p_church and c.sabbath_date = v_date),
    'session', case when v_s.id is null then null else jsonb_build_object(
      'id', v_s.id, 'live', v_live, 'accepting', v_s.accepting, 'limit', v_s.request_limit,
      'startedAt', v_s.started_at, 'closesAt', v_s.closes_at, 'endedAt', v_s.ended_at,
      'updatedAt', v_s.updated_at) end,
    'isAdmin', v_admin,
    'isChorister', v_chorister,
    'canLead', v_lead,
    'canRequest', v_request,
    'queue', v_queue,
    'mine', v_mine,
    'hymnals', v_hymnals
  );
end;
$$;

-- Cheap check for the "Song Service is live" banner on church pages.
create function public.song_service_live(p_church uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.song_sessions s join public.churches c on c.id = s.church_id
    where s.church_id = p_church and s.sabbath_date = private.next_sabbath()
      and s.status = 'live' and s.closes_at > now() and c.song_requests
  );
$$;

-- ---------------------------------------------------------------- admin
-- Starts (or reopens) this Sabbath's Song Service. Programme admins only.
create function public.start_song_service(p_church uuid, p_minutes int default 180) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if not private.has_capability(p_church, 'programme.edit') then
    raise exception 'Only church admins can start Song Service' using errcode = '42501';
  end if;
  if not coalesce((select song_requests from public.churches where id = p_church), false) then
    raise exception 'Song requests are switched off' using errcode = 'P0001', hint = 'off';
  end if;
  if p_minutes is null or p_minutes not between 30 and 360 then
    raise exception 'Choose between 30 minutes and 6 hours' using errcode = '22023';
  end if;

  insert into public.song_sessions as s (church_id, sabbath_date, started_by, closes_at)
  values (p_church, private.next_sabbath(), v_uid, now() + make_interval(mins => p_minutes))
  on conflict (church_id, sabbath_date) do update
     set status = 'live', accepting = true, ended_at = null, closes_at = excluded.closes_at,
         started_by = excluded.started_by, updated_at = now()
  returning s.id into v_id;

  insert into public.audit_log (church_id, actor_id, action, subject)
  values (p_church, v_uid, 'song_service.started', v_id::text);
  return v_id;
end;
$$;

create function public.end_song_service(p_session uuid) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_s public.song_sessions := private.require_song_leader(p_session);
begin
  update public.song_sessions set status = 'closed', ended_at = now(), updated_at = now()
   where id = v_s.id;
  insert into public.audit_log (church_id, actor_id, action, subject)
  values (v_s.church_id, (select auth.uid()), 'song_service.ended', v_s.id::text);
end;
$$;

-- Pause/resume requests and the per-person limit. Null leaves a setting as is.
create function public.update_song_service(p_session uuid, p_accepting boolean, p_limit int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_s public.song_sessions := private.require_song_leader(p_session);
begin
  if p_limit is not null and p_limit not between 1 and 10 then
    raise exception 'Choose a limit from 1 to 10' using errcode = '22023';
  end if;
  update public.song_sessions
     set accepting = coalesce(p_accepting, accepting),
         request_limit = coalesce(p_limit, request_limit),
         updated_at = now()
   where id = v_s.id;
end;
$$;

-- ---------------------------------------------------------------- chorister
-- Next / Sung / defer for one row of the list (all requests for that hymn).
-- Only one hymn is "next" (Now singing) at a time.
create function public.set_song_status(p_session uuid, p_ids uuid[], p_status text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_s public.song_sessions := private.require_song_leader(p_session);
begin
  if p_status not in ('requested', 'next', 'sung', 'deferred') then
    raise exception 'Unknown status' using errcode = '22023';
  end if;
  if v_s.status <> 'live' or v_s.closes_at <= now() then
    raise exception 'Song Service has ended' using errcode = 'P0001', hint = 'closed';
  end if;
  if p_status = 'next' then
    update public.song_requests set status = 'requested', updated_at = now()
     where session_id = v_s.id and status = 'next' and id <> all (p_ids);
  end if;
  update public.song_requests set status = p_status, updated_at = now()
   where session_id = v_s.id and id = any (p_ids);
  update public.song_sessions set updated_at = now() where id = v_s.id;
end;
$$;

-- A request the chorister adds for someone without a smartphone.
create function public.add_manual_song(p_session uuid, p_hymnal uuid, p_number int, p_title text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_s  public.song_sessions := private.require_song_leader(p_session);
  v_id uuid;
begin
  if v_s.status <> 'live' or v_s.closes_at <= now() then
    raise exception 'Song Service has ended' using errcode = 'P0001', hint = 'closed';
  end if;
  if p_number is null and nullif(btrim(p_title), '') is null then
    raise exception 'Enter a hymn number or title' using errcode = '22023';
  end if;
  if p_hymnal is not null and not exists (select 1 from public.hymnals
                                          where id = p_hymnal and church_id = v_s.church_id) then
    raise exception 'Unknown hymnal' using errcode = '22023';
  end if;
  insert into public.song_requests (session_id, manual, hymnal_id, hymn_number, title)
  values (v_s.id, true, p_hymnal, p_number, nullif(btrim(p_title), ''))
  returning id into v_id;
  update public.song_sessions set updated_at = now() where id = v_s.id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- members
-- A follower requests a hymn by number. Asking for the same hymn again
-- returns the first request, so a request queued offline and sent twice
-- counts once.
create function public.request_song(p_church uuid, p_hymnal uuid, p_number int, p_anonymous boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_s     public.song_sessions;
  v_id    uuid;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501', hint = 'signin';
  end if;
  if p_number is null or p_number not between 1 and 2000 then
    raise exception 'Choose a hymn number' using errcode = '22023';
  end if;

  select * into v_s from public.song_sessions
   where church_id = p_church and sabbath_date = private.next_sabbath()
   for update;
  if not found or v_s.status <> 'live' or v_s.closes_at <= now()
     or not coalesce((select song_requests from public.churches where id = p_church), false) then
    raise exception 'Song Service is not live' using errcode = 'P0001', hint = 'closed';
  end if;
  if not v_s.accepting then
    raise exception 'Requests are paused' using errcode = 'P0001', hint = 'paused';
  end if;
  if not (exists (select 1 from public.follows where user_id = v_uid and church_id = p_church)
          or private.is_church_admin(p_church)
          or private.is_chorister(p_church, v_s.sabbath_date)) then
    raise exception 'Follow this church to request songs' using errcode = '42501', hint = 'follow';
  end if;
  if p_hymnal is not null and not exists (select 1 from public.hymnals
                                          where id = p_hymnal and church_id = p_church) then
    raise exception 'Unknown hymnal' using errcode = '22023';
  end if;

  select id into v_id from public.song_requests
   where session_id = v_s.id and user_id = v_uid and hymn_number = p_number
     and hymnal_id is not distinct from p_hymnal and status in ('requested', 'next');
  if found then
    return v_id;
  end if;

  select count(*) into v_count from public.song_requests where session_id = v_s.id and user_id = v_uid;
  if v_count >= v_s.request_limit then
    raise exception 'You have used your requests for today' using errcode = 'P0001', hint = 'limit';
  end if;

  insert into public.song_requests (session_id, user_id, hymnal_id, hymn_number, anonymous)
  values (v_s.id, v_uid, p_hymnal, p_number, coalesce(p_anonymous, false))
  returning id into v_id;
  update public.song_sessions set updated_at = now() where id = v_s.id;
  return v_id;
end;
$$;

-- Withdraws one's own request before it is sung.
create function public.cancel_song_request(p_id uuid) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_session uuid;
begin
  delete from public.song_requests
   where id = p_id and user_id = (select auth.uid()) and status = 'requested'
  returning session_id into v_session;
  if v_session is not null then
    update public.song_sessions set updated_at = now() where id = v_session;
  end if;
end;
$$;

-- ---------------------------------------------------------------- erasure
-- Same as before, and the person's phone is removed from chorister records.
create or replace function public.delete_my_account() returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if exists (select 1 from public.church_admins where user_id = v_uid and is_owner) then
    raise exception 'Hand over your church first' using errcode = 'P0001', hint = 'owner';
  end if;
  update public.choristers set phone = null
   where phone = (select phone from public.profiles where id = v_uid);
  -- Recorded without the person's id, which is about to disappear.
  insert into public.audit_log (action, subject) values ('account.deleted', null);
  delete from auth.users where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------- grants
revoke all on function
  public.song_service_live(uuid),
  public.song_service_view(uuid),
  public.start_song_service(uuid, int),
  public.end_song_service(uuid),
  public.update_song_service(uuid, boolean, int),
  public.set_song_status(uuid, uuid[], text),
  public.add_manual_song(uuid, uuid, int, text),
  public.request_song(uuid, uuid, int, boolean),
  public.cancel_song_request(uuid)
  from public, anon;
-- Visitors see whether Song Service is live and what is being sung.
grant execute on function public.song_service_live(uuid), public.song_service_view(uuid)
  to anon, authenticated;
grant execute on function
  public.start_song_service(uuid, int),
  public.end_song_service(uuid),
  public.update_song_service(uuid, boolean, int),
  public.set_song_status(uuid, uuid[], text),
  public.add_manual_song(uuid, uuid, int, text),
  public.request_song(uuid, uuid, int, boolean),
  public.cancel_song_request(uuid)
  to authenticated;
