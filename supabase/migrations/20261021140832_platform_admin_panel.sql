-- Platform admin panel (CLAUDE.md, "Platform admin panel").
-- Platform admins read across the platform through RLS; every change they make
-- goes through a function below that checks private.is_platform_admin() and
-- writes audit_log. Nothing here uses a service-role key.

-- ---------------------------------------------------------------- columns
alter table public.platform_admins
  add column name     text not null default '',
  add column added_by uuid references auth.users (id) on delete set null,
  add column added_at timestamptz not null default now();
create index platform_admins_added_by_idx on public.platform_admins (added_by);

alter table public.churches
  -- Why a church was rejected or suspended; shown to staff.
  add column status_reason text,
  -- Staff can hide giving details while a fraud report is checked.
  add column giving_hidden boolean not null default false;

-- ---------------------------------------------------------------- messages
-- Staff messages to people. Recipients are fixed when the message is sent, so
-- someone who follows a church later doesn't receive older messages.
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid references auth.users (id) on delete set null,
  audience        text not null check (audience in ('person', 'church_admins', 'all_admins',
                                                    'church_followers', 'everyone')),
  church_id       uuid references public.churches (id) on delete set null,
  title           text not null check (length(title) between 1 and 80),
  body            text not null check (length(body) between 1 and 600),
  send_sms        boolean not null default false,
  recipient_count int not null default 0,
  sent_at         timestamptz not null default now()
);
create index messages_sender_idx on public.messages (sender_id);
create index messages_church_idx on public.messages (church_id);
create index messages_sent_idx on public.messages (sent_at desc);

create table public.message_recipients (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  read_at    timestamptz,
  -- 'queued' until an SMS provider is connected and sends it.
  sms_status text not null default 'none' check (sms_status in ('none', 'queued', 'sent', 'failed')),
  primary key (message_id, user_id)
);
create index message_recipients_user_idx on public.message_recipients (user_id, read_at);

alter table public.messages           enable row level security;
alter table public.message_recipients enable row level security;

-- ---------------------------------------------------------------- helpers
create function private.require_platform_admin() returns void
  language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Platform admins only' using errcode = '42501';
  end if;
end;
$$;

-- Giving shows only for verified churches whose details staff haven't hidden.
create or replace function private.church_is_verified(p_church uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.churches
                 where id = p_church and status = 'verified' and not giving_hidden);
$$;

create function private.platform_audit(p_church uuid, p_action text, p_subject text, p_detail jsonb)
  returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (church_id, actor_id, action, subject, detail)
  values (p_church, (select auth.uid()), p_action, p_subject, p_detail);
$$;

revoke all on function private.require_platform_admin(), private.platform_audit(uuid, text, text, jsonb)
  from public;

-- ---------------------------------------------------------------- read access
-- Suspended churches leave public view, like rejected ones.
drop policy "churches readable" on public.churches;
create policy "churches readable" on public.churches for select to anon, authenticated
  using (status in ('verified', 'pending') or private.is_church_admin(id) or private.is_platform_admin());

create policy "platform reads profiles" on public.profiles for select to authenticated
  using (private.is_platform_admin());
create policy "platform admins see each other" on public.platform_admins for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads teams" on public.church_admins for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads follows" on public.follows for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads programmes" on public.programmes for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads items" on public.programme_items for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads roles" on public.programme_roles for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads announcements" on public.announcements for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads categories" on public.giving_categories for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads methods" on public.payment_methods for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads accounts" on public.payment_method_accounts for select to authenticated
  using (private.is_platform_admin());
create policy "platform reads payment changes" on public.payment_change_requests for select to authenticated
  using (private.is_platform_admin());

create policy "recipients and staff read messages" on public.messages for select to authenticated
  using (private.is_platform_admin()
         or exists (select 1 from public.message_recipients r
                    where r.message_id = messages.id and r.user_id = (select auth.uid())));
create policy "own inbox" on public.message_recipients for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());
create policy "mark own messages read" on public.message_recipients for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.messages, public.message_recipients to authenticated;
grant update (read_at) on public.message_recipients to authenticated;

-- ---------------------------------------------------------------- staff actions
create function public.platform_stats() returns jsonb
  language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  return jsonb_build_object(
    'churches', coalesce((select jsonb_object_agg(status, n)
                          from (select status, count(*) n from public.churches group by status) s), '{}'),
    'accounts', (select count(*) from public.profiles),
    'admins', (select count(*) from public.church_admins where status = 'active'),
    'applications', (select count(*) from public.church_applications where decided_at is null),
    'paymentChanges', (select count(*) from public.payment_change_requests where approved_by is null)
  );
end;
$$;

-- Records that a staff member opened a person's or church's details.
create function public.platform_log_view(p_kind text, p_id uuid) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  if p_kind not in ('person', 'church') then raise exception 'Unknown kind' using errcode = '22023'; end if;
  perform private.platform_audit(case when p_kind = 'church' then p_id end, 'viewed.' || p_kind, p_id::text, null);
end;
$$;

create function public.platform_set_church_status(p_church uuid, p_status public.church_status, p_reason text)
  returns void language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := nullif(btrim(p_reason), '');
  v_name   text;
begin
  perform private.require_platform_admin();
  if p_status in ('rejected', 'suspended') and v_reason is null then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  update public.churches
     set status = p_status,
         status_reason = case when p_status = 'verified' then null else v_reason end,
         verified_at = case when p_status = 'verified' then coalesce(verified_at, now()) else verified_at end,
         verified_by = case when p_status = 'verified' then coalesce(verified_by, (select auth.uid())) else verified_by end
   where id = p_church
  returning name into v_name;
  if v_name is null then raise exception 'Church not found' using errcode = 'P0002'; end if;
  if p_status in ('verified', 'rejected') then
    update public.church_applications
       set decided_at = now(), decision_note = v_reason
     where church_id = p_church and decided_at is null;
  end if;
  perform private.platform_audit(p_church, 'church.' || p_status, v_name, jsonb_build_object('reason', v_reason));
end;
$$;

create function public.platform_set_giving_hidden(p_church uuid, p_hidden boolean, p_reason text)
  returns void language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  perform private.require_platform_admin();
  if p_hidden and nullif(btrim(p_reason), '') is null then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  update public.churches set giving_hidden = p_hidden where id = p_church returning name into v_name;
  if v_name is null then raise exception 'Church not found' using errcode = 'P0002'; end if;
  perform private.platform_audit(p_church, case when p_hidden then 'giving.hidden' else 'giving.shown' end,
                                 v_name, jsonb_build_object('reason', nullif(btrim(p_reason), '')));
end;
$$;

create function public.platform_update_church(p_church uuid, p jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  perform private.require_platform_admin();
  update public.churches c set
    name = coalesce(nullif(btrim(p ->> 'name'), ''), c.name),
    short_name = coalesce(nullif(btrim(p ->> 'short_name'), ''), c.short_name),
    district = coalesce(btrim(p ->> 'district'), c.district),
    conference = coalesce(btrim(p ->> 'conference'), c.conference),
    town = coalesce(btrim(p ->> 'town'), c.town),
    county = coalesce(btrim(p ->> 'county'), c.county),
    landmark = coalesce(btrim(p ->> 'landmark'), c.landmark),
    kiswahili_service = coalesce((p ->> 'kiswahili_service')::boolean, c.kiswahili_service)
  where id = p_church
  returning name into v_name;
  if v_name is null then raise exception 'Church not found' using errcode = 'P0002'; end if;
  perform private.platform_audit(p_church, 'church.edited', v_name, p);
end;
$$;

create function public.platform_remove_post(p_kind text, p_id uuid, p_reason text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_church uuid;
  v_title  text;
begin
  perform private.require_platform_admin();
  if nullif(btrim(p_reason), '') is null then raise exception 'A reason is required' using errcode = '22023'; end if;
  if p_kind = 'announcement' then
    delete from public.announcements where id = p_id returning church_id, title into v_church, v_title;
  elsif p_kind = 'event' then
    delete from public.events where id = p_id returning church_id, title into v_church, v_title;
  else
    raise exception 'Unknown kind' using errcode = '22023';
  end if;
  if v_church is null then raise exception 'Not found' using errcode = 'P0002'; end if;
  perform private.platform_audit(v_church, p_kind || '.removed', v_title, jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

create function public.platform_remove_admin(p_admin uuid, p_reason text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  a public.church_admins;
begin
  perform private.require_platform_admin();
  if nullif(btrim(p_reason), '') is null then raise exception 'A reason is required' using errcode = '22023'; end if;
  select * into a from public.church_admins where id = p_admin;
  if a.id is null then raise exception 'Not found' using errcode = 'P0002'; end if;
  if a.is_owner then raise exception 'Pass ownership to someone else first' using errcode = '22023'; end if;
  delete from public.church_admins where id = p_admin;
  perform private.platform_audit(a.church_id, 'admin.removed', a.phone,
                                 jsonb_build_object('role', a.role, 'reason', btrim(p_reason)));
end;
$$;

-- For churches that lost access to the owner's phone: ownership moves to another active admin.
create function public.platform_make_owner(p_admin uuid) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  a public.church_admins;
begin
  perform private.require_platform_admin();
  select * into a from public.church_admins where id = p_admin;
  if a.id is null or a.status <> 'active' then
    raise exception 'Choose an active admin' using errcode = '22023';
  end if;
  update public.church_admins set is_owner = false where church_id = a.church_id and is_owner;
  update public.church_admins set is_owner = true where id = p_admin;
  perform private.platform_audit(a.church_id, 'owner.changed', a.phone, null);
end;
$$;

create function public.platform_set_platform_admin(p_user uuid, p_on boolean) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_phone text;
begin
  perform private.require_platform_admin();
  select phone into v_phone from public.profiles where id = p_user;
  if v_phone is null then raise exception 'Not found' using errcode = 'P0002'; end if;
  if p_on then
    insert into public.platform_admins (user_id, name, added_by)
    select p_user, p.name, (select auth.uid()) from public.profiles p where p.id = p_user
    on conflict (user_id) do nothing;
  else
    if p_user = (select auth.uid()) then
      raise exception 'Ask another platform admin to remove you' using errcode = '22023';
    end if;
    delete from public.platform_admins where user_id = p_user;
  end if;
  perform private.platform_audit(null, case when p_on then 'platform_admin.added' else 'platform_admin.removed' end,
                                 v_phone, null);
end;
$$;

-- Sends an in-app message (and queues SMS when asked) to everyone in the audience.
create function public.platform_send_message(p_audience text, p_church uuid, p_user uuid,
                                             p_title text, p_body text, p_sms boolean)
  returns int language plpgsql security definer set search_path = '' as $$
declare
  v_id    uuid;
  v_count int;
begin
  perform private.require_platform_admin();
  if p_audience in ('church_admins', 'church_followers') and p_church is null then
    raise exception 'Choose a church' using errcode = '22023';
  end if;
  if p_audience = 'person' and p_user is null then
    raise exception 'Choose a person' using errcode = '22023';
  end if;

  insert into public.messages (sender_id, audience, church_id, title, body, send_sms)
  values ((select auth.uid()), p_audience, case when p_audience like 'church_%' then p_church end,
          btrim(p_title), btrim(p_body), p_sms)
  returning id into v_id;

  insert into public.message_recipients (message_id, user_id, sms_status)
  select v_id, p.id, case when p_sms and p.phone is not null then 'queued' else 'none' end
  from public.profiles p
  where case p_audience
          when 'person' then p.id = p_user
          when 'church_admins' then exists (select 1 from public.church_admins a
                                            where a.user_id = p.id and a.church_id = p_church and a.status = 'active')
          when 'all_admins' then exists (select 1 from public.church_admins a
                                         where a.user_id = p.id and a.status = 'active')
          when 'church_followers' then exists (select 1 from public.follows f
                                               where f.user_id = p.id and f.church_id = p_church)
          when 'everyone' then true
          else false
        end;
  get diagnostics v_count = row_count;

  update public.messages set recipient_count = v_count where id = v_id;
  perform private.platform_audit(case when p_audience like 'church_%' then p_church end, 'message.sent',
                                 btrim(p_title), jsonb_build_object('audience', p_audience, 'recipients', v_count,
                                                                    'sms', p_sms));
  return v_count;
end;
$$;

revoke all on function
  public.platform_stats(),
  public.platform_log_view(text, uuid),
  public.platform_set_church_status(uuid, public.church_status, text),
  public.platform_set_giving_hidden(uuid, boolean, text),
  public.platform_update_church(uuid, jsonb),
  public.platform_remove_post(text, uuid, text),
  public.platform_remove_admin(uuid, text),
  public.platform_make_owner(uuid),
  public.platform_set_platform_admin(uuid, boolean),
  public.platform_send_message(text, uuid, uuid, text, text, boolean)
  from public, anon;
grant execute on function
  public.platform_stats(),
  public.platform_log_view(text, uuid),
  public.platform_set_church_status(uuid, public.church_status, text),
  public.platform_set_giving_hidden(uuid, boolean, text),
  public.platform_update_church(uuid, jsonb),
  public.platform_remove_post(text, uuid, text),
  public.platform_remove_admin(uuid, text),
  public.platform_make_owner(uuid),
  public.platform_set_platform_admin(uuid, boolean),
  public.platform_send_message(text, uuid, uuid, text, text, boolean)
  to authenticated;
