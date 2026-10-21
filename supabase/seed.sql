-- Demo content for development and pilot demos: the sample churches from the
-- design. NOT real churches, people or payment numbers.
-- Never load this into a database real members use.
--
-- Load:   npx supabase db query --db-url "$SUPABASE_DB_URL" -f supabase/seed.sql
-- Remove: delete from public.churches where id in (select private.seed_id(k) from unnest(array['ch-orc','ch-rtc','ch-kh','ch-kl','ch-km']) k);
--
-- Ids are derived from readable keys so the script can be re-run safely.

create or replace function private.seed_id(k text) returns uuid
  language sql immutable set search_path = '' as $$ select md5('sabbathlink-seed:' || k)::uuid $$;
revoke all on function private.seed_id(text) from public;

-- The coming Sabbath in Nairobi.
create temporary table seed_dates as
select (n + ((6 - extract(isodow from n)::int + 7) % 7))::date as sabbath
from (select (now() at time zone 'Africa/Nairobi')::date as n) d;

insert into public.churches (id, slug, name, short_name, district, conference, town, county, landmark,
                             lat, lng, status, kiswahili_service, verified_at)
values
  (private.seed_id('ch-orc'), 'ongata-rongai-central', 'Ongata Rongai Central Church', 'Ongata Rongai Central',
   'Rongai District', 'Central Region Conference', 'Ongata Rongai', 'Kajiado County',
   'Magadi Road, opposite the market', -1.3962, 36.7553, 'verified', true, now()),
  (private.seed_id('ch-rtc'), 'rongai-tuala', 'Rongai Tuala Church', 'Rongai Tuala Church',
   'Rongai District', 'Central Region Conference', 'Ongata Rongai', 'Kajiado County',
   'Tuala Road, near the shopping centre', -1.4103, 36.7712, 'verified', false, now()),
  (private.seed_id('ch-kh'), 'kiserian-hillside', 'Kiserian Hillside Church', 'Kiserian Hillside',
   'Ngong District', 'Central Region Conference', 'Kiserian', 'Kajiado County',
   'Hillside, above the bus stage', -1.4291, 36.6869, 'pending', true, null),
  (private.seed_id('ch-kl'), 'karen-lane', 'Karen Lane Church', 'Karen Lane Church',
   'Karen District', 'Central Region Conference', 'Karen', 'Nairobi County',
   'Karen Lane, off Langata Road', -1.3371, 36.7317, 'verified', false, now()),
  (private.seed_id('ch-km'), 'kisumu-milimani', 'Kisumu Milimani Church', 'Kisumu Milimani',
   'Kisumu District', 'Nyanza Conference', 'Kisumu', 'Kisumu County',
   'Milimani, near the stadium', -0.1022, 34.7617, 'verified', true, now())
on conflict (id) do nothing;

delete from public.service_times
 where church_id in (select private.seed_id(k) from unnest(array['ch-orc','ch-rtc','ch-kh','ch-kl','ch-km']) k);
insert into public.service_times (church_id, kind, day, time)
select private.seed_id(c), k::public.item_kind, d::public.weekday, t::time
from (values
  ('ch-orc', 'sabbath_school', 'sat', '08:30'), ('ch-orc', 'divine_service', 'sat', '11:00'),
  ('ch-orc', 'ay', 'sat', '15:00'), ('ch-orc', 'prayer_meeting', 'wed', '18:00'),
  ('ch-rtc', 'sabbath_school', 'sat', '09:00'), ('ch-rtc', 'divine_service', 'sat', '11:15'),
  ('ch-kh', 'sabbath_school', 'sat', '08:30'), ('ch-kh', 'divine_service', 'sat', '10:45'),
  ('ch-kl', 'sabbath_school', 'sat', '08:45'), ('ch-kl', 'divine_service', 'sat', '11:00'),
  ('ch-km', 'sabbath_school', 'sat', '09:00'), ('ch-km', 'divine_service', 'sat', '11:00')
) v(c, k, d, t);

-- ---------------------------------------------------------------- programmes (coming Sabbath)
insert into public.programmes (id, church_id, sabbath_date, status, sunset, updated_at, updated_by_role, published_at)
select private.seed_id(p), private.seed_id(c), s.sabbath, 'published', su::time, now() - interval '1 day',
       r::public.admin_role, now() - interval '1 day'
from seed_dates s, (values ('pg-orc', 'ch-orc', '18:39', 'clerk'), ('pg-km', 'ch-km', null, 'communication')) v(p, c, su, r)
on conflict (church_id, sabbath_date) do nothing;

insert into public.programme_items (id, programme_id, position, kind, start_time)
select private.seed_id(i), private.seed_id(p), pos, k::public.item_kind, t::time
from (values
  ('it-ss', 'pg-orc', 0, 'sabbath_school', '08:30'), ('it-ds', 'pg-orc', 1, 'divine_service', '11:00'),
  ('it-ay', 'pg-orc', 2, 'ay', '15:00'), ('it-v', 'pg-orc', 3, 'vespers', '18:15'),
  ('km-ss', 'pg-km', 0, 'sabbath_school', '09:00'), ('km-ds', 'pg-km', 1, 'divine_service', '11:00')
) v(i, p, pos, k, t)
where exists (select 1 from public.programmes where id = private.seed_id(p))
on conflict (id) do nothing;

insert into public.programme_roles (id, item_id, position, role_key, value, optional)
select private.seed_id(r), private.seed_id(i), pos, k::public.role_key, val, opt
from (values
  ('r1', 'it-ss', 0, 'superintendent', 'Grace Wanjiru', false),
  ('r2', 'it-ss', 1, 'mission_story', 'Brian Otieno', false),
  ('r3', 'it-ss', 2, 'lesson', 'In classes · teachers listed', false),
  ('r4', 'it-ds', 0, 'preacher', 'Pr. Samuel Kiprono', false),
  ('r5', 'it-ds', 1, 'sermon_title', 'Walking in the light', true),
  ('r6', 'it-ds', 2, 'platform_elder', 'Elder Joseph Mwangi', false),
  ('r7', 'it-ds', 3, 'song_leader', 'Faith Achieng', false),
  ('r8', 'it-ds', 4, 'deacons', 'Peter Kamau, Mary Njeri', false),
  ('r9', 'it-ds', 5, 'special_music', 'Youth choir', false),
  ('r10', 'it-ay', 0, 'leader', 'Dennis Ochieng', false),
  ('r11', 'it-ay', 1, 'theme', 'Faith at work', false),
  ('k1', 'km-ss', 0, 'superintendent', 'Mary Atieno', false),
  ('k2', 'km-ds', 0, 'preacher', 'Pr. Tom Odhiambo', false)
) v(r, i, pos, k, val, opt)
where exists (select 1 from public.programme_items where id = private.seed_id(i))
on conflict (id) do nothing;

-- ---------------------------------------------------------------- posts
insert into public.announcements (id, church_id, title, body, posted_at, hide_after)
select private.seed_id('an-1'), private.seed_id('ch-orc'), 'Church business meeting',
       'Right after Divine Service this Sabbath, in the main hall. All members are welcome.',
       now() - interval '2 days', (s.sabbath + time '23:59') at time zone 'Africa/Nairobi'
from seed_dates s
union all
select private.seed_id('an-2'), private.seed_id('ch-orc'), 'Harvest thanksgiving pledges',
       'Please bring pledges by the end of next month. Give under "Harvest" on the Give tab.',
       now() - interval '9 days', null
on conflict (id) do nothing;

insert into public.events (id, church_id, title, starts_at, ends_at, place, hide_after)
select private.seed_id(e), private.seed_id('ch-orc'), title,
       (s.sabbath + o + st) at time zone 'Africa/Nairobi',
       case when en is null then null else (s.sabbath + o + en) at time zone 'Africa/Nairobi' end,
       place,
       (s.sabbath + o + coalesce(en, st + interval '3 hours')) at time zone 'Africa/Nairobi'
from seed_dates s, (values
  ('ev-1', 'Youth Rally & Music Day', 7, time '14:30', time '17:30', 'Church grounds'),
  ('ev-2', 'Health expo & free screening', 15, time '09:00', time '15:00', 'Open to the community'),
  ('ev-3', 'Community clean-up', 36, time '08:00', null, 'Meet at the gate'),
  ('ev-0', 'Family life seminar', -14, time '09:00', time '15:00', 'Main hall')
) v(e, title, o, st, en, place)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- giving (placeholder numbers)
insert into public.giving_categories (id, church_id, key, label, enabled, position)
select private.seed_id(g), private.seed_id('ch-orc'), k::public.giving_key, l, true, pos
from (values ('gc-tithe', 'tithe', null, 0), ('gc-off', 'offering', null, 1),
             ('gc-bld', 'building_fund', null, 2), ('gc-wel', 'welfare', null, 3),
             ('gc-lcb', 'local_church_budget', null, 4), ('gc-hv', null, 'Harvest', 5)) v(g, k, l, pos)
on conflict (id) do nothing;

insert into public.payment_methods (id, church_id, type, position, number, account_name, bank_name, branch,
                                    bank_account_number, note)
values
  (private.seed_id('pm-paybill'), private.seed_id('ch-orc'), 'paybill', 0, '908712', 'ONGATA RONGAI CENTRAL CHURCH',
   null, null, null, null),
  (private.seed_id('pm-till'), private.seed_id('ch-orc'), 'till', 1, '5342118', 'ONGATA RONGAI CENTRAL CHURCH',
   null, null, null, 'offering_on_the_day'),
  (private.seed_id('pm-bank'), private.seed_id('ch-orc'), 'bank', 2, null, 'Ongata Rongai Central Church',
   'Co-operative Bank', 'Rongai Branch', '01129 4471 8800', null),
  -- A pending church's details exist but must never be shown.
  (private.seed_id('pm-kh'), private.seed_id('ch-kh'), 'paybill', 0, '000000', 'KISERIAN HILLSIDE CHURCH',
   null, null, null, null)
on conflict (id) do nothing;

insert into public.payment_method_accounts (method_id, category_id, account)
select private.seed_id('pm-paybill'), private.seed_id(g), a
from (values ('gc-tithe', 'TITHE'), ('gc-off', 'OFFERING'), ('gc-bld', 'BUILDING'),
             ('gc-wel', 'WELFARE'), ('gc-lcb', 'LCB'), ('gc-hv', 'HARVEST')) v(g, a)
on conflict do nothing;

-- ---------------------------------------------------------------- team (invites only)
-- Sample officers as pending invites. To manage Ongata Rongai Central
-- yourself, invite your own number as owner and sign in with it:
--   insert into public.church_admins (church_id, phone, role, is_owner)
--   values (private.seed_id('ch-orc'), '+2547XXXXXXXX', 'clerk', true);
insert into public.church_admins (church_id, phone, role, status)
select private.seed_id('ch-orc'), p, r::public.admin_role, 'invited'
from (values ('+254722000111', 'communication'), ('+254711000222', 'treasurer'),
             ('+254733000412', 'elder')) v(p, r)
on conflict (church_id, phone) do nothing;

drop table seed_dates;
