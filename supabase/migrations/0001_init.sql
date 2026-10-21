-- SabbathLink Phase 1 schema.
-- Times are stored as timestamptz (UTC); programme times of day are wall-clock
-- Africa/Nairobi. Currency is KES. Row Level Security is on for every table,
-- and mirrors src/lib/permissions.ts.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type church_status   as enum ('pending', 'verified', 'rejected');
create type admin_role      as enum ('clerk', 'treasurer', 'communication', 'elder');
create type admin_status    as enum ('active', 'invited');
create type programme_state as enum ('draft', 'published');
create type item_kind       as enum ('sabbath_school', 'divine_service', 'ay', 'vespers', 'prayer_meeting', 'custom');
create type role_key        as enum ('superintendent', 'mission_story', 'lesson', 'preacher', 'sermon_title',
                                     'platform_elder', 'song_leader', 'deacons', 'special_music', 'leader',
                                     'theme', 'custom');
create type weekday         as enum ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');
create type payment_type    as enum ('paybill', 'till', 'bank');
create type giving_key      as enum ('tithe', 'offering', 'building_fund', 'welfare', 'local_church_budget');

-- ---------------------------------------------------------------- organisations
-- District / conference / union hierarchy (Phase 4). Unused for now, but
-- churches can point at their parent from day one.
create table organisations (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('district', 'conference', 'union')),
  name       text not null,
  parent_id  uuid references organisations (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- churches
create table churches (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  short_name        text not null,
  district          text not null default '',
  conference        text not null default '',
  town              text not null default '',
  county            text not null default '',
  landmark          text not null default '',
  lat               double precision,
  lng               double precision,
  kiswahili_service boolean not null default false,
  status            church_status not null default 'pending',
  parent_org_id     uuid references organisations (id),
  verified_at       timestamptz,
  verified_by       uuid references auth.users (id),
  created_at        timestamptz not null default now()
);
create index churches_town_idx on churches (lower(town));

create table service_times (
  id        uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches (id) on delete cascade,
  kind      item_kind not null,
  title     text,
  day       weekday not null,
  time      time not null
);

-- Verification letters live in a private storage bucket; only platform admins read them.
create table church_applications (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references churches (id) on delete cascade,
  applicant_id uuid not null references auth.users (id),
  applicant_role admin_role not null,
  letter_path  text,
  submitted_at timestamptz not null default now(),
  decided_at   timestamptz,
  decision_note text
);

-- ---------------------------------------------------------------- people
-- Platform users (accounts). Deliberately separate from the membership roll
-- (Phase 2): a user is a verified member only once a clerk confirms it.
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  phone      text not null check (phone ~ '^\+254[17]\d{8}$'),
  locale     text not null default 'en' check (locale in ('en', 'sw')),
  created_at timestamptz not null default now()
);

create table platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table church_admins (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete cascade,
  phone      text not null check (phone ~ '^\+254[17]\d{8}$'),
  role       admin_role not null,
  is_owner   boolean not null default false,
  status     admin_status not null default 'invited',
  invited_at timestamptz not null default now(),
  unique (church_id, phone)
);
-- Exactly one owner per church.
create unique index church_admins_one_owner on church_admins (church_id) where is_owner;

create table follows (
  user_id    uuid not null references auth.users (id) on delete cascade,
  church_id  uuid not null references churches (id) on delete cascade,
  is_my_church boolean not null default false,
  notify     text not null default 'everything' check (notify in ('everything', 'programme_only')),
  created_at timestamptz not null default now(),
  primary key (user_id, church_id)
);

-- ---------------------------------------------------------------- programmes
create table programmes (
  id            uuid primary key default gen_random_uuid(),
  church_id     uuid not null references churches (id) on delete cascade,
  sabbath_date  date not null,
  status        programme_state not null default 'draft',
  sunset        time,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id),
  published_at  timestamptz,
  unique (church_id, sabbath_date)
);

create table programme_items (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid not null references programmes (id) on delete cascade,
  position     int not null,
  kind         item_kind not null,
  title        text,
  start_time   time not null
);

create table programme_roles (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references programme_items (id) on delete cascade,
  position  int not null,
  role_key  role_key not null,
  label     text,
  value     text,
  optional  boolean not null default false
);

-- ---------------------------------------------------------------- posts
create table announcements (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches (id) on delete cascade,
  title      text not null check (length(title) <= 120),
  body       text not null check (length(body) <= 500),
  posted_at  timestamptz not null default now(),
  posted_by  uuid references auth.users (id),
  hide_after timestamptz
);

create table events (
  id         uuid primary key default gen_random_uuid(),
  church_id  uuid not null references churches (id) on delete cascade,
  title      text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  place      text not null default '',
  hide_after timestamptz
);

-- ---------------------------------------------------------------- giving (display only)
-- SabbathLink never holds money: these are the church's own numbers, shown to members.
create table giving_categories (
  id        uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches (id) on delete cascade,
  key       giving_key,
  label     text,
  enabled   boolean not null default true,
  position  int not null default 0,
  check (key is not null or label is not null)
);

create table payment_methods (
  id                  uuid primary key default gen_random_uuid(),
  church_id           uuid not null references churches (id) on delete cascade,
  type                payment_type not null,
  position            int not null default 0,
  number              text,
  account_name        text not null,
  bank_name           text,
  branch              text,
  bank_account_number text,
  note                text
);

create table payment_method_accounts (
  method_id   uuid not null references payment_methods (id) on delete cascade,
  category_id uuid not null references giving_categories (id) on delete cascade,
  account     text not null,
  primary key (method_id, category_id)
);

-- A change to payment details waits here until a second admin approves it.
create table payment_change_requests (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references churches (id) on delete cascade,
  method_id    uuid references payment_methods (id) on delete cascade,
  remove       boolean not null default false,
  change       jsonb not null,
  requested_by uuid not null references auth.users (id),
  requested_at timestamptz not null default now(),
  approved_by  uuid references auth.users (id),
  approved_at  timestamptz,
  check (approved_by is null or approved_by <> requested_by)
);

-- Giving records (Phase 3) will reference giving_categories; nothing is collected in Phase 1.

-- ---------------------------------------------------------------- audit
create table audit_log (
  id         bigint generated always as identity primary key,
  church_id  uuid references churches (id) on delete set null,
  actor_id   uuid references auth.users (id),
  action     text not null,
  subject    text,
  detail     jsonb,
  at         timestamptz not null default now()
);

-- ---------------------------------------------------------------- permission helpers
create or replace function is_platform_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- Mirrors ROLE_CAPABILITIES / OWNER_CAPABILITIES in src/lib/permissions.ts.
create or replace function has_capability(p_church uuid, p_cap text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from church_admins a
    where a.church_id = p_church and a.user_id = auth.uid() and a.status = 'active'
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

create or replace function is_church_admin(p_church uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from church_admins
                 where church_id = p_church and user_id = auth.uid() and status = 'active');
$$;

create or replace function church_is_verified(p_church uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from churches where id = p_church and status = 'verified');
$$;

-- ---------------------------------------------------------------- row level security
alter table organisations           enable row level security;
alter table churches                enable row level security;
alter table service_times           enable row level security;
alter table church_applications     enable row level security;
alter table profiles                enable row level security;
alter table platform_admins         enable row level security;
alter table church_admins           enable row level security;
alter table follows                 enable row level security;
alter table programmes              enable row level security;
alter table programme_items         enable row level security;
alter table programme_roles         enable row level security;
alter table announcements           enable row level security;
alter table events                  enable row level security;
alter table giving_categories       enable row level security;
alter table payment_methods         enable row level security;
alter table payment_method_accounts enable row level security;
alter table payment_change_requests enable row level security;
alter table audit_log               enable row level security;

create policy "organisations are public" on organisations for select using (true);

-- Pending churches are reachable by link (and by their own admins), never rejected ones.
create policy "churches readable" on churches for select
  using (status <> 'rejected' or is_church_admin(id) or is_platform_admin());
create policy "admins edit their church" on churches for update
  using (has_capability(id, 'church.edit')) with check (has_capability(id, 'church.edit'));
create policy "platform admins verify" on churches for update using (is_platform_admin());
create policy "signed-in users apply" on churches for insert to authenticated with check (status = 'pending');

create policy "service times readable" on service_times for select using (true);
create policy "service times editable" on service_times for all
  using (has_capability(church_id, 'church.edit')) with check (has_capability(church_id, 'church.edit'));

create policy "applicant and platform read" on church_applications for select
  using (applicant_id = auth.uid() or is_platform_admin());
create policy "applicant submits" on church_applications for insert to authenticated
  with check (applicant_id = auth.uid());

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "platform admins listed to themselves" on platform_admins for select using (user_id = auth.uid());

create policy "team visible to fellow admins" on church_admins for select
  using (is_church_admin(church_id) or user_id = auth.uid());
create policy "invite admins" on church_admins for insert
  with check (has_capability(church_id, 'team.invite') and not is_owner);
create policy "manage team" on church_admins for update using (has_capability(church_id, 'team.manage'));

create policy "own follows" on follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "published programmes are public" on programmes for select
  using (status = 'published' or has_capability(church_id, 'programme.edit'));
create policy "edit programmes" on programmes for all
  using (has_capability(church_id, 'programme.edit'))
  with check (has_capability(church_id, 'programme.edit'));

create policy "items follow programme" on programme_items for select
  using (exists (select 1 from programmes p where p.id = programme_id
                 and (p.status = 'published' or has_capability(p.church_id, 'programme.edit'))));
create policy "edit items" on programme_items for all
  using (exists (select 1 from programmes p where p.id = programme_id and has_capability(p.church_id, 'programme.edit')))
  with check (exists (select 1 from programmes p where p.id = programme_id and has_capability(p.church_id, 'programme.edit')));

create policy "roles follow programme" on programme_roles for select
  using (exists (select 1 from programme_items i join programmes p on p.id = i.programme_id
                 where i.id = item_id and (p.status = 'published' or has_capability(p.church_id, 'programme.edit'))));
create policy "edit roles" on programme_roles for all
  using (exists (select 1 from programme_items i join programmes p on p.id = i.programme_id
                 where i.id = item_id and has_capability(p.church_id, 'programme.edit')))
  with check (exists (select 1 from programme_items i join programmes p on p.id = i.programme_id
                      where i.id = item_id and has_capability(p.church_id, 'programme.edit')));

-- Expired posts disappear by themselves.
create policy "live announcements are public" on announcements for select
  using (hide_after is null or hide_after > now() or has_capability(church_id, 'posts.edit'));
create policy "edit announcements" on announcements for all
  using (has_capability(church_id, 'posts.edit')) with check (has_capability(church_id, 'posts.edit'));

create policy "events are public" on events for select using (true);
create policy "edit events" on events for all
  using (has_capability(church_id, 'posts.edit')) with check (has_capability(church_id, 'posts.edit'));

-- Giving details are public only for verified churches.
create policy "categories of verified churches" on giving_categories for select
  using (church_is_verified(church_id) or has_capability(church_id, 'giving.view'));
create policy "edit categories" on giving_categories for all
  using (has_capability(church_id, 'giving.edit')) with check (has_capability(church_id, 'giving.edit'));

create policy "methods of verified churches" on payment_methods for select
  using (church_is_verified(church_id) or has_capability(church_id, 'giving.view'));
-- No insert/update/delete policy: methods change only through an approved change request
-- (applied by a security-definer function once approved_by is set).

create policy "accounts of verified churches" on payment_method_accounts for select
  using (exists (select 1 from payment_methods m where m.id = method_id
                 and (church_is_verified(m.church_id) or has_capability(m.church_id, 'giving.view'))));

create policy "giving admins see requests" on payment_change_requests for select
  using (has_capability(church_id, 'giving.view'));
create policy "request a change" on payment_change_requests for insert
  with check (has_capability(church_id, 'giving.edit') and requested_by = auth.uid() and approved_by is null);
create policy "second admin approves" on payment_change_requests for update
  using (has_capability(church_id, 'giving.approve') and requested_by <> auth.uid())
  with check (approved_by = auth.uid());

-- The audit log is append-only and readable by platform admins.
create policy "platform reads audit" on audit_log for select using (is_platform_admin());
create policy "write own audit rows" on audit_log for insert to authenticated with check (actor_id = auth.uid());
