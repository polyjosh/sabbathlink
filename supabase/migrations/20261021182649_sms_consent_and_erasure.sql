-- SMS sending, privacy consent and account deletion (CLAUDE.md, "Security,
-- privacy, and compliance" and "Platform admin panel" → Messages).

-- ---------------------------------------------------------------- profiles
-- sms_opt_out: the person asked for no SMS from SabbathLink (sign-in codes
--   still arrive; they are what the person asked for).
-- consented_at / privacy_version: when they accepted which privacy notice.
alter table public.profiles
  add column sms_opt_out     boolean not null default false,
  add column consented_at    timestamptz,
  add column privacy_version text check (privacy_version is null or length(privacy_version) <= 20);

grant update (sms_opt_out) on public.profiles to authenticated;

-- Records consent with the server's clock, so the time can't be made up.
create function public.accept_privacy(p_version text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_version is null or length(p_version) not between 1 and 20 then
    raise exception 'Unknown privacy notice' using errcode = '22023';
  end if;
  update public.profiles set consented_at = now(), privacy_version = p_version where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------- SMS queue
-- 'sending' marks rows a staff member's send has taken, so two sends at once
-- never text the same person twice. A send that dies mid-way leaves rows in
-- 'sending'; after 15 minutes they can be taken again.
alter table public.message_recipients drop constraint message_recipients_sms_status_check;
alter table public.message_recipients
  add constraint message_recipients_sms_status_check
    check (sms_status in ('none', 'queued', 'sending', 'sent', 'failed')),
  add column sms_attempted_at timestamptz;
create index message_recipients_sms_idx on public.message_recipients (sms_status)
  where sms_status in ('queued', 'sending');

-- Same as before, but people who turned SMS off get the inbox message only.
create or replace function public.platform_send_message(p_audience text, p_church uuid, p_user uuid,
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
  select v_id, p.id, case when p_sms and p.phone is not null and not p.sms_opt_out then 'queued' else 'none' end
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

-- Takes up to p_limit waiting SMS for the caller (staff) to send, with the
-- phone numbers to send them to. Anyone who has since turned SMS off is
-- dropped from the queue instead.
create function public.platform_take_sms(p_limit int default 200)
  returns table (message_id uuid, user_id uuid, phone text, title text, body text)
  language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();

  update public.message_recipients r set sms_status = 'none'
    from public.profiles p
   where p.id = r.user_id and r.sms_status = 'queued' and (p.sms_opt_out or p.phone is null);

  return query
  with picked as (
    select r.message_id, r.user_id
      from public.message_recipients r
     where r.sms_status = 'queued'
        or (r.sms_status = 'sending' and r.sms_attempted_at < now() - interval '15 minutes')
     order by r.message_id
     limit least(greatest(p_limit, 1), 500)
     for update skip locked
  ), taken as (
    update public.message_recipients r
       set sms_status = 'sending', sms_attempted_at = now()
      from picked
     where r.message_id = picked.message_id and r.user_id = picked.user_id
    returning r.message_id, r.user_id
  )
  select t.message_id, t.user_id, p.phone, m.title, m.body
    from taken t
    join public.profiles p on p.id = t.user_id
    join public.messages m on m.id = t.message_id;
end;
$$;

-- Records what the SMS provider said: p is [{message_id, user_id, sent}].
create function public.platform_record_sms(p jsonb) returns void
  language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  update public.message_recipients r
     set sms_status = case when (x ->> 'sent')::boolean then 'sent' else 'failed' end
    from jsonb_array_elements(coalesce(p, '[]'::jsonb)) x
   where r.message_id = (x ->> 'message_id')::uuid
     and r.user_id = (x ->> 'user_id')::uuid
     and r.sms_status = 'sending';
end;
$$;

-- Waiting/sent/failed counts per message, for the staff messages list.
create function public.platform_sms_counts()
  returns table (message_id uuid, queued int, sent int, failed int)
  language sql stable security definer set search_path = '' as $$
  select r.message_id,
         count(*) filter (where r.sms_status in ('queued', 'sending'))::int,
         count(*) filter (where r.sms_status = 'sent')::int,
         count(*) filter (where r.sms_status = 'failed')::int
    from public.message_recipients r
   where private.is_platform_admin() and r.sms_status <> 'none'
   group by r.message_id;
$$;

-- ---------------------------------------------------------------- erasure
-- Deleting a staff member's account must not be blocked by churches they verified.
alter table public.churches drop constraint churches_verified_by_fkey;
alter table public.churches
  add constraint churches_verified_by_fkey foreign key (verified_by)
  references auth.users (id) on delete set null;

-- Deletes the caller's account and everything tied to it: profile, follows,
-- admin roles, inbox. Church records they edited stay, without their name.
-- An owner must hand the church over first, so no church is left without one.
create function public.delete_my_account() returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if exists (select 1 from public.church_admins where user_id = v_uid and is_owner) then
    raise exception 'Hand over your church first' using errcode = 'P0001', hint = 'owner';
  end if;
  -- Recorded without the person's id, which is about to disappear.
  insert into public.audit_log (action, subject) values ('account.deleted', null);
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function
  public.accept_privacy(text),
  public.platform_take_sms(int),
  public.platform_record_sms(jsonb),
  public.platform_sms_counts(),
  public.delete_my_account()
  from public, anon;
grant execute on function
  public.accept_privacy(text),
  public.platform_take_sms(int),
  public.platform_record_sms(jsonb),
  public.platform_sms_counts(),
  public.delete_my_account()
  to authenticated;
