-- SabbathLink Phase 1 schema.
-- Times are stored as timestamptz (UTC); programme times of day are wall-clock
-- Africa/Nairobi. Currency is KES. Row Level Security is on for every table,
-- and mirrors src/lib/permissions.ts.
--
-- Access model (see "grants" at the end):
--   anon           reads public church content only
--   authenticated  also reads/writes what RLS allows for their own account
--   writes that span several rows or need trusted data go through the
--   functions below (register_church, claim_admin_invites, hand_over_ownership,
--   save_programme); they check auth.uid() themselves.
-- Church verification is done by platform staff in the Supabase dashboard
-- until the platform-admin screen exists, so no API role can change a
-- church's status.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- enums
create type public.church_status   as enum ('pending', 'verified', 'rejected');
create type public.admin_role      as enum ('clerk', 'treasurer', 'communication', 'elder');
create type public.admin_status    as enum ('active', 'invited');
create type public.programme_state as enum ('draft', 'published');
create type public.item_kind       as enum ('sabbath_school', 'divine_service', 'ay', 'vespers', 'prayer_meeting', 'custom');
create type public.role_key        as enum ('superintendent', 'mission_story', 'lesson', 'preacher', 'sermon_title',
                                            'platform_elder', 'song_leader', 'deacons', 'special_music', 'leader',
                                            'theme', 'custom');
create type public.weekday         as enum ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');
create type public.payment_type    as enum ('paybill', 'till', 'bank');
create type public.giving_key      as enum ('tithe', 'offering', 'building_fund', 'welfare', 'local_church_budget');

-- ---------------------------------------------------------------- organisations
-- District / conference / union hierarchy (Phase 4). Unused for now, but
-- churches can point at their parent from day one.
create table public.organisations (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('district', 'conference', 'union')),
  name       text not null,
  parent_id  uuid references public.organisations (id),
  created_at timestamptz not null default now()
);
create index organisations_parent_idx on public.organisations (parent_id);

-- ---------------------------------------------------------------- churches
create table public.churches (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null check (length(name) between 1 and 120),
  short_name        text not null,
  district          text not null default '',
  conference        text not null default '',
  town              text not null default '',
  county            text not null default '',
  landmark          text not null default '',
  lat               double precision check (lat between -90 and 90),
  lng               double precision check (lng between -180 and 180),
  kiswahili_service boolean not null default false,
  status            public.church_status not null default 'pending',
  parent_org_id     uuid references public.organisations (id),
  verified_at       timestamptz,
  verified_by       uuid references auth.users (id),
  created_at        timestamptz not null default now()
);
create index churches_status_idx on public.churches (status);
create index churches_parent_org_idx on public.churches (parent_org_id);

create table public.service_times (
  id        uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  kind      public.item_kind not null,
  title     text,
  day       public.weekday not null,
  time      time not null
);
create index service_times_church_idx on public.service_times (church_id);

-- Verification letters will live in a private storage bucket; only platform admins read them.
create table public.church_applications (
  id             uuid primary key default gen_random_uuid(),
  church_id      uuid not null references public.churches (id) on delete cascade,
  applicant_id   uuid not null references auth.users (id) on delete cascade,
  applicant_role public.admin_role not null,
  letter_path    text,
  submitted_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decision_note  text
);
create index church_applications_applicant_idx on public.church_applications (applicant_id, submitted_at desc);
create index church_applications_church_idx on public.church_applications (church_id);

-- ---------------------------------------------------------------- people
-- Platform users (accounts). Deliberately separate from the membership roll
-- (Phase 2): a user is a verified member only once a clerk confirms it.
-- Rows are created by a trigger on auth.users; phone mirrors the verified
-- sign-in number.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '' check (length(name) <= 80),
  phone      text check (phone ~ '^\+\d{8,15}$'),
  locale     text not null default 'en' check (locale in ('en', 'sw')),
  created_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.church_admins (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references public.churches (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete cascade,
  -- Copied from the profile when the invite is claimed, so fellow admins can
  -- see who is on the team without reading each other's profiles.
  name       text,
  phone      text not null check (phone ~ '^\+254[17]\d{8}$'),
  role       public.admin_role not null,
  is_owner   boolean not null default false,
  status     public.admin_status not null default 'invited',
  invited_at timestamptz not null default now(),
  unique (church_id, phone),
  check (status = 'invited' or user_id is not null)
);
-- Exactly one owner per church.
create unique index church_admins_one_owner on public.church_admins (church_id) where is_owner;
create index church_admins_user_idx on public.church_admins (user_id);
create index church_admins_phone_idx on public.church_admins (phone) where user_id is null;

create table public.follows (
  user_id    uuid not null references auth.users (id) on delete cascade,
  church_id  uuid not null references public.churches (id) on delete cascade,
  notify     text not null default 'everything' check (notify in ('everything', 'programme_only')),
  created_at timestamptz not null default now(),
  primary key (user_id, church_id)
);
create index follows_church_idx on public.follows (church_id);

-- ---------------------------------------------------------------- programmes
create table public.programmes (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid not null references public.churches (id) on delete cascade,
  sabbath_date    date not null,
  status          public.programme_state not null default 'draft',
  sunset          time,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id) on delete set null,
  -- Shown to members as "Updated Thu by the clerk".
  updated_by_role public.admin_role,
  published_at    timestamptz,
  unique (church_id, sabbath_date)
);

create table public.programme_items (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  position     int not null,
  kind         public.item_kind not null,
  title        text,
  start_time   time not null,
  note         text
);
create index programme_items_programme_idx on public.programme_items (programme_id, position);

create table public.programme_roles (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references public.programme_items (id) on delete cascade,
  position  int not null,
  role_key  public.role_key not null,
  label     text,
  value     text,
  optional  boolean not null default false
);
create index programme_roles_item_idx on public.programme_roles (item_id, position);

-- ---------------------------------------------------------------- posts
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references public.churches (id) on delete cascade,
  title      text not null check (length(title) <= 120),
  body       text not null check (length(body) <= 500),
  posted_at  timestamptz not null default now(),
  posted_by  uuid references auth.users (id) on delete set null,
  hide_after timestamptz
);
create index announcements_church_idx on public.announcements (church_id, posted_at desc);

create table public.events (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references public.churches (id) on delete cascade,
  title      text not null check (length(title) <= 120),
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  place      text not null default '',
  hide_after timestamptz
);
create index events_church_idx on public.events (church_id, starts_at);

-- ---------------------------------------------------------------- giving (display only)
-- SabbathLink never holds money: these are the church's own numbers, shown to members.
create table public.giving_categories (
  id        uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  key       public.giving_key,
  label     text check (length(label) <= 40),
  enabled   boolean not null default true,
  position  int not null default 0,
  check (key is not null or label is not null)
);
create index giving_categories_church_idx on public.giving_categories (church_id, position);

create table public.payment_methods (
  id                  uuid primary key default gen_random_uuid(),
  church_id           uuid not null references public.churches (id) on delete cascade,
  type                public.payment_type not null,
  position            int not null default 0,
  number              text,
  account_name        text not null,
  bank_name           text,
  branch              text,
  bank_account_number text,
  note                text
);
create index payment_methods_church_idx on public.payment_methods (church_id, position);

create table public.payment_method_accounts (
  method_id   uuid not null references public.payment_methods (id) on delete cascade,
  category_id uuid not null references public.giving_categories (id) on delete cascade,
  account     text not null,
  primary key (method_id, category_id)
);
create index payment_method_accounts_category_idx on public.payment_method_accounts (category_id);

-- A change to payment details waits here until a second admin approves it.
create table public.payment_change_requests (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.churches (id) on delete cascade,
  method_id    uuid references public.payment_methods (id) on delete cascade,
  remove       boolean not null default false,
  change       jsonb not null,
  requested_by uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  approved_by  uuid references auth.users (id) on delete set null,
  approved_at  timestamptz,
  check (approved_by is null or approved_by <> requested_by)
);
create index payment_change_requests_church_idx on public.payment_change_requests (church_id);
create index payment_change_requests_method_idx on public.payment_change_requests (method_id);

-- Giving records (Phase 3) will reference giving_categories; nothing is collected in Phase 1.

-- ---------------------------------------------------------------- audit
-- Also feeds the admin dashboard's "Recent activity". detail holds
-- { "tone": "default" | "accent", "actor_name": text }.
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid references public.churches (id) on delete set null,
  actor_id   uuid references auth.users (id) on delete set null,
  action     text not null,
  subject    text,
  detail     jsonb,
  at         timestamptz not null default now()
);
create index audit_log_church_idx on public.audit_log (church_id, at desc);

-- ---------------------------------------------------------------- permission helpers
-- Kept in a schema the Data API doesn't expose. They are SECURITY DEFINER so
-- policies can read church_admins without recursing into its own policies;
-- each only answers questions about the calling user.
create schema private;

create function private.is_platform_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

-- Mirrors ROLE_CAPABILITIES / OWNER_CAPABILITIES in src/lib/permissions.ts.
create function private.has_capability(p_church uuid, p_cap text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.church_admins a
    where a.church_id = p_church and a.user_id = (select auth.uid()) and a.status = 'active'
      and (
        (a.is_owner and p_cap in ('giving.view', 'giving.edit', 'giving.approve', 'team.invite',
                                  'team.manage', 'church.edit', 'ownership.handover'))
        or (a.role = 'clerk' and p_cap in ('programme.edit', 'posts.edit', 'giving.view',
                                           'giving.approve', 'team.invite', 'church.edit'))
        or (a.role in ('communication', 'elder') and p_cap in ('programme.edit', 'posts.edit'))
        or (a.role = 'treasurer' and p_cap in ('giving.view', 'giving.edit', 'giving.approve'))
      )
  );
$$;

create function private.is_church_admin(p_church uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.church_admins
                 where church_id = p_church and user_id = (select auth.uid()) and status = 'active');
$$;

create function private.church_is_verified(p_church uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.churches where id = p_church and status = 'verified');
$$;

-- New accounts get a profile carrying their verified phone number.
create function private.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, case when new.phone ~ '^\+?\d{8,15}$' then '+' || ltrim(new.phone, '+') end)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on all functions in schema private from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_platform_admin(), private.has_capability(uuid, text),
  private.is_church_admin(uuid), private.church_is_verified(uuid) to anon, authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.organisations           enable row level security;
alter table public.churches                enable row level security;
alter table public.service_times           enable row level security;
alter table public.church_applications     enable row level security;
alter table public.profiles                enable row level security;
alter table public.platform_admins         enable row level security;
alter table public.church_admins           enable row level security;
alter table public.follows                 enable row level security;
alter table public.programmes              enable row level security;
alter table public.programme_items         enable row level security;
alter table public.programme_roles         enable row level security;
alter table public.announcements           enable row level security;
alter table public.events                  enable row level security;
alter table public.giving_categories       enable row level security;
alter table public.payment_methods         enable row level security;
alter table public.payment_method_accounts enable row level security;
alter table public.payment_change_requests enable row level security;
alter table public.audit_log               enable row level security;

create policy "organisations are public" on public.organisations for select
  to anon, authenticated using (true);

-- Pending churches open by link (only verified ones are listed); rejected ones
-- only for their own admins and platform staff.
create policy "churches readable" on public.churches for select to anon, authenticated
  using (status <> 'rejected' or private.is_church_admin(id) or private.is_platform_admin());
-- Column grants below keep status and verification fields out of reach.
create policy "admins edit their church" on public.churches for update to authenticated
  using (private.has_capability(id, 'church.edit'))
  with check (private.has_capability(id, 'church.edit'));

create policy "service times readable" on public.service_times for select
  to anon, authenticated using (true);
create policy "service times insert" on public.service_times for insert to authenticated
  with check (private.has_capability(church_id, 'church.edit'));
create policy "service times update" on public.service_times for update to authenticated
  using (private.has_capability(church_id, 'church.edit'))
  with check (private.has_capability(church_id, 'church.edit'));
create policy "service times delete" on public.service_times for delete to authenticated
  using (private.has_capability(church_id, 'church.edit'));

create policy "applicant and platform read" on public.church_applications for select to authenticated
  using (applicant_id = (select auth.uid()) or private.is_platform_admin());

create policy "own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "platform admins listed to themselves" on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy "team visible to fellow admins" on public.church_admins for select to authenticated
  using (private.is_church_admin(church_id) or user_id = (select auth.uid()));
-- An invite is only a phone number and a role; the person claims it by
-- signing in with that number (claim_admin_invites).
create policy "invite admins" on public.church_admins for insert to authenticated
  with check (private.has_capability(church_id, 'team.invite')
              and not is_owner and user_id is null and status = 'invited');
create policy "manage team" on public.church_admins for update to authenticated
  using (private.has_capability(church_id, 'team.manage'))
  with check (private.has_capability(church_id, 'team.manage'));
create policy "remove admins" on public.church_admins for delete to authenticated
  using (private.has_capability(church_id, 'team.manage') and not is_owner);

create policy "read own follows" on public.follows for select to authenticated
  using (user_id = (select auth.uid()));
create policy "follow" on public.follows for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "change own follows" on public.follows for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "unfollow" on public.follows for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "published programmes are public" on public.programmes for select to anon, authenticated
  using (status = 'published' or private.has_capability(church_id, 'programme.edit'));
create policy "add programmes" on public.programmes for insert to authenticated
  with check (private.has_capability(church_id, 'programme.edit'));
create policy "edit programmes" on public.programmes for update to authenticated
  using (private.has_capability(church_id, 'programme.edit'))
  with check (private.has_capability(church_id, 'programme.edit'));
create policy "delete programmes" on public.programmes for delete to authenticated
  using (private.has_capability(church_id, 'programme.edit'));

create policy "items follow programme" on public.programme_items for select to anon, authenticated
  using (exists (select 1 from public.programmes p where p.id = programme_id
                 and (p.status = 'published' or private.has_capability(p.church_id, 'programme.edit'))));
create policy "add items" on public.programme_items for insert to authenticated
  with check (exists (select 1 from public.programmes p where p.id = programme_id
                      and private.has_capability(p.church_id, 'programme.edit')));
create policy "edit items" on public.programme_items for update to authenticated
  using (exists (select 1 from public.programmes p where p.id = programme_id
                 and private.has_capability(p.church_id, 'programme.edit')))
  with check (exists (select 1 from public.programmes p where p.id = programme_id
                      and private.has_capability(p.church_id, 'programme.edit')));
create policy "delete items" on public.programme_items for delete to authenticated
  using (exists (select 1 from public.programmes p where p.id = programme_id
                 and private.has_capability(p.church_id, 'programme.edit')));

create policy "roles follow programme" on public.programme_roles for select to anon, authenticated
  using (exists (select 1 from public.programme_items i join public.programmes p on p.id = i.programme_id
                 where i.id = item_id
                   and (p.status = 'published' or private.has_capability(p.church_id, 'programme.edit'))));
create policy "add roles" on public.programme_roles for insert to authenticated
  with check (exists (select 1 from public.programme_items i join public.programmes p on p.id = i.programme_id
                      where i.id = item_id and private.has_capability(p.church_id, 'programme.edit')));
create policy "edit roles" on public.programme_roles for update to authenticated
  using (exists (select 1 from public.programme_items i join public.programmes p on p.id = i.programme_id
                 where i.id = item_id and private.has_capability(p.church_id, 'programme.edit')))
  with check (exists (select 1 from public.programme_items i join public.programmes p on p.id = i.programme_id
                      where i.id = item_id and private.has_capability(p.church_id, 'programme.edit')));
create policy "delete roles" on public.programme_roles for delete to authenticated
  using (exists (select 1 from public.programme_items i join public.programmes p on p.id = i.programme_id
                 where i.id = item_id and private.has_capability(p.church_id, 'programme.edit')));

-- Expired posts disappear by themselves.
create policy "live announcements are public" on public.announcements for select to anon, authenticated
  using (hide_after is null or hide_after > now() or private.has_capability(church_id, 'posts.edit'));
create policy "post announcements" on public.announcements for insert to authenticated
  with check (private.has_capability(church_id, 'posts.edit') and posted_by = (select auth.uid()));
create policy "edit announcements" on public.announcements for update to authenticated
  using (private.has_capability(church_id, 'posts.edit'))
  with check (private.has_capability(church_id, 'posts.edit'));
create policy "delete announcements" on public.announcements for delete to authenticated
  using (private.has_capability(church_id, 'posts.edit'));

-- Past events stay readable for the "Past" tab.
create policy "events are public" on public.events for select to anon, authenticated using (true);
create policy "add events" on public.events for insert to authenticated
  with check (private.has_capability(church_id, 'posts.edit'));
create policy "edit events" on public.events for update to authenticated
  using (private.has_capability(church_id, 'posts.edit'))
  with check (private.has_capability(church_id, 'posts.edit'));
create policy "delete events" on public.events for delete to authenticated
  using (private.has_capability(church_id, 'posts.edit'));

-- Giving details are public only for verified churches.
create policy "categories of verified churches" on public.giving_categories for select to anon, authenticated
  using (private.church_is_verified(church_id) or private.has_capability(church_id, 'giving.view'));
create policy "add categories" on public.giving_categories for insert to authenticated
  with check (private.has_capability(church_id, 'giving.edit'));
create policy "edit categories" on public.giving_categories for update to authenticated
  using (private.has_capability(church_id, 'giving.edit'))
  with check (private.has_capability(church_id, 'giving.edit'));

create policy "methods of verified churches" on public.payment_methods for select to anon, authenticated
  using (private.church_is_verified(church_id) or private.has_capability(church_id, 'giving.view'));
-- Only the display order can be changed directly (column grant below); the
-- numbers themselves change only through an approved change request.
create policy "reorder methods" on public.payment_methods for update to authenticated
  using (private.has_capability(church_id, 'giving.edit'))
  with check (private.has_capability(church_id, 'giving.edit'));

create policy "accounts of verified churches" on public.payment_method_accounts for select to anon, authenticated
  using (exists (select 1 from public.payment_methods m where m.id = method_id
                 and (private.church_is_verified(m.church_id) or private.has_capability(m.church_id, 'giving.view'))));

create policy "giving admins see requests" on public.payment_change_requests for select to authenticated
  using (private.has_capability(church_id, 'giving.view'));
create policy "request a change" on public.payment_change_requests for insert to authenticated
  with check (private.has_capability(church_id, 'giving.edit')
              and requested_by = (select auth.uid()) and approved_by is null);
create policy "second admin approves" on public.payment_change_requests for update to authenticated
  using (private.has_capability(church_id, 'giving.approve') and requested_by <> (select auth.uid()))
  with check (approved_by = (select auth.uid()));

-- Church admins see their church's activity; platform staff see everything.
create policy "read activity" on public.audit_log for select to authenticated
  using (private.is_church_admin(church_id) or private.is_platform_admin());
create policy "write own audit rows" on public.audit_log for insert to authenticated
  with check (actor_id = (select auth.uid())
              and (church_id is null or private.is_church_admin(church_id)));

-- ---------------------------------------------------------------- functions called by the app
-- Registers a church as pending, with the caller as its owner and first admin.
create function public.register_church(p jsonb) returns text
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_phone text;
  v_name  text;
  v_id    uuid;
  v_slug  text;
  v_title text := btrim(p ->> 'name');
  v_role  public.admin_role := (p ->> 'role')::public.admin_role;
  t       jsonb;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if v_title is null or length(v_title) not between 1 and 120 then
    raise exception 'Church name is required' using errcode = '22023';
  end if;
  select phone, nullif(name, '') into v_phone, v_name from public.profiles where id = v_uid;
  if v_phone is null or v_phone !~ '^\+254[17]\d{8}$' then
    raise exception 'A Kenyan phone number is required' using errcode = '22023';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'))
            || '-' || substr(md5(gen_random_uuid()::text), 1, 4);

  insert into public.churches (slug, name, short_name, district, conference, town, landmark, lat, lng)
  values (v_slug, v_title, regexp_replace(v_title, '\s+Church$', '', 'i'),
          coalesce(left(p ->> 'district', 120), ''), coalesce(left(p ->> 'conference', 120), ''),
          coalesce(left(p ->> 'town', 120), ''), coalesce(left(p ->> 'landmark', 120), ''),
          (p ->> 'lat')::double precision, (p ->> 'lng')::double precision)
  returning id into v_id;

  for t in select * from jsonb_array_elements(coalesce(p -> 'times', '[]'::jsonb)) limit 10 loop
    insert into public.service_times (church_id, kind, day, time)
    values (v_id, (t ->> 'kind')::public.item_kind, (t ->> 'day')::public.weekday, (t ->> 'time')::time);
  end loop;

  insert into public.church_admins (church_id, user_id, name, phone, role, is_owner, status)
  values (v_id, v_uid, v_name, v_phone, v_role, true, 'active');

  insert into public.giving_categories (church_id, key, position)
  select v_id, k, n - 1
  from unnest(array['tithe', 'offering', 'building_fund', 'welfare', 'local_church_budget']::public.giving_key[])
       with ordinality as x(k, n);

  insert into public.church_applications (church_id, applicant_id, applicant_role)
  values (v_id, v_uid, v_role);

  return v_slug;
end;
$$;

-- Activates invites sent to the caller's verified phone number.
create function public.claim_admin_invites() returns int
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_count int;
begin
  if v_uid is null then return 0; end if;
  update public.church_admins a
     set user_id = v_uid, status = 'active', name = coalesce(nullif(p.name, ''), a.name)
    from public.profiles p
   where p.id = v_uid and a.phone = p.phone and a.user_id is null and a.status = 'invited';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Passes ownership to another active admin; optionally the old owner leaves.
create function public.hand_over_ownership(p_to uuid, p_leave boolean) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  v_church uuid;
begin
  select church_id into v_church from public.church_admins
   where id = p_to and status = 'active' and user_id is distinct from v_uid;
  if v_church is null
     or not exists (select 1 from public.church_admins
                    where church_id = v_church and user_id = v_uid and is_owner and status = 'active') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.church_admins set is_owner = false where church_id = v_church and user_id = v_uid;
  update public.church_admins set is_owner = true where id = p_to;
  if p_leave then
    delete from public.church_admins where church_id = v_church and user_id = v_uid;
  end if;
  insert into public.audit_log (church_id, actor_id, action, subject)
  values (v_church, v_uid, 'handed_over', p_to::text);
end;
$$;

-- Saves a week's programme in one transaction. Runs as the caller, so RLS
-- decides whether they may edit this church's programme.
create function public.save_programme(p_church uuid, p_date date, p_items jsonb, p_publish boolean)
returns table (updated_at timestamptz, status public.programme_state)
  language plpgsql security invoker set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_role public.admin_role;
  v_id   uuid;
  v_item uuid;
  it     jsonb;
  r      jsonb;
  i      int := 0;
  j      int;
begin
  select a.role into v_role from public.church_admins a
   where a.church_id = p_church and a.user_id = v_uid and a.status = 'active';

  insert into public.programmes as pg (church_id, sabbath_date, updated_by, updated_by_role)
  values (p_church, p_date, v_uid, v_role)
  on conflict (church_id, sabbath_date) do update
     set updated_at = now(), updated_by = excluded.updated_by, updated_by_role = excluded.updated_by_role
  returning pg.id into v_id;

  if p_publish then
    update public.programmes set status = 'published', published_at = now() where id = v_id;
  end if;

  delete from public.programme_items where programme_id = v_id;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into public.programme_items (programme_id, position, kind, title, start_time, note)
    values (v_id, i, (it ->> 'kind')::public.item_kind, it ->> 'title', (it ->> 'startTime')::time, it ->> 'note')
    returning id into v_item;
    j := 0;
    for r in select * from jsonb_array_elements(coalesce(it -> 'roles', '[]'::jsonb)) loop
      insert into public.programme_roles (item_id, position, role_key, label, value, optional)
      values (v_item, j, (r ->> 'roleKey')::public.role_key, r ->> 'label', r ->> 'value',
              coalesce((r ->> 'optional')::boolean, false));
      j := j + 1;
    end loop;
    i := i + 1;
  end loop;

  return query select p.updated_at, p.status from public.programmes p where p.id = v_id;
end;
$$;

revoke all on function public.register_church(jsonb), public.claim_admin_invites(),
  public.hand_over_ownership(uuid, boolean), public.save_programme(uuid, date, jsonb, boolean)
  from public, anon;
grant execute on function public.register_church(jsonb), public.claim_admin_invites(),
  public.hand_over_ownership(uuid, boolean), public.save_programme(uuid, date, jsonb, boolean)
  to authenticated;

-- ---------------------------------------------------------------- grants (Data API)
-- New Supabase projects no longer expose tables automatically, so access is
-- granted explicitly; RLS above then decides which rows.
revoke all on public.organisations, public.churches, public.service_times, public.church_applications,
  public.profiles, public.platform_admins, public.church_admins, public.follows, public.programmes,
  public.programme_items, public.programme_roles, public.announcements, public.events,
  public.giving_categories, public.payment_methods, public.payment_method_accounts,
  public.payment_change_requests, public.audit_log
  from anon, authenticated;

grant select on public.organisations, public.churches, public.service_times, public.programmes,
  public.programme_items, public.programme_roles, public.announcements, public.events,
  public.giving_categories, public.payment_methods, public.payment_method_accounts
  to anon, authenticated;

grant select on public.church_applications, public.profiles, public.platform_admins,
  public.church_admins, public.follows, public.payment_change_requests, public.audit_log
  to authenticated;

grant update (name, short_name, district, conference, town, county, landmark, lat, lng, kiswahili_service)
  on public.churches to authenticated;
grant insert, update, delete on public.service_times to authenticated;
grant update (name, locale) on public.profiles to authenticated;
grant insert (church_id, phone, role) on public.church_admins to authenticated;
grant update (role) on public.church_admins to authenticated;
grant delete on public.church_admins to authenticated;
grant insert, update (notify), delete on public.follows to authenticated;
grant insert, update, delete on public.programmes, public.programme_items, public.programme_roles
  to authenticated;
grant insert, update, delete on public.announcements, public.events to authenticated;
grant insert, update (label, enabled, position) on public.giving_categories to authenticated;
grant update (position) on public.payment_methods to authenticated;
grant insert (church_id, method_id, remove, change, requested_by) on public.payment_change_requests
  to authenticated;
grant update (approved_by, approved_at) on public.payment_change_requests to authenticated;
grant insert (church_id, actor_id, action, subject, detail) on public.audit_log to authenticated;
