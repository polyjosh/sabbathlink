-- Song Service permission rules (CLAUDE.md, Phase 1.5): who can start, request,
-- lead and end, the per-person limit, duplicate requests, and erasure.
-- Run against a database with at least one active church admin:
--   npx supabase db query --linked -f supabase/tests/song_service_test.sql
-- It always ends with an exception, so every change is rolled back. The
-- exception message lists each check; anything in capitals (ALLOWED, NOTHIT)
-- is a failure. Expected:
--   presession:null fstart:blocked directread:blocked fchorister:blocked
--   reqBeforeStart:blocked start:ok dupSame:true limit:You have used your
--   requests for today fpause:blocked f.canLead:false f.mine:2 f.names:null
--   outsider:blocked outsiderLead:blocked c.canLead:true c.chor:Test Chorister
--   c.names:… next:245 paused:false rows:3 chorAfterEnd:blocked
--   c.canLeadAfter:false f.live:false f.sung:sung afterEnd:blocked
--   anon.view:true anon.req:false anonChor:blocked erasedPhone:1
do $$
declare
  adm uuid; ch uuid; d date := private.next_sabbath();
  cu uuid := gen_random_uuid(); fu uuid := gen_random_uuid(); ou uuid := gen_random_uuid();
  sid uuid; a uuid; b uuid; v jsonb; ids uuid[];
  r text := ''; n int;
begin
  select user_id, church_id into adm, ch from public.church_admins
   where status = 'active' and role in ('clerk','communication','elder') and user_id is not null limit 1;
  insert into auth.users (id, instance_id, aud, role, phone, created_at, updated_at) values
   (cu, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '254711000901', now(), now()),
   (fu, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '254711000902', now(), now()),
   (ou, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '254711000903', now(), now());
  update public.profiles set name = 'Follower Fiona' where id = fu;
  insert into public.follows (user_id, church_id) values (fu, ch);

  perform set_config('request.jwt.claims', json_build_object('sub', fu, 'role','authenticated')::text, true);
  set local role authenticated;
  v := public.song_service_view(ch); r := r || 'presession:' || coalesce(v->>'session','null');
  begin perform public.start_song_service(ch, 120); r := r || ' fstart:ALLOWED'; exception when others then r := r || ' fstart:blocked'; end;
  begin perform count(*) from public.song_requests; r := r || ' directread:ALLOWED'; exception when others then r := r || ' directread:blocked'; end;
  begin insert into public.choristers (church_id, sabbath_date, name) values (ch, d, 'x'); r := r || ' fchorister:ALLOWED'; exception when others then r := r || ' fchorister:blocked'; end;
  begin perform public.request_song(ch, null, 245, false); r := r || ' reqBeforeStart:ALLOWED'; exception when others then r := r || ' reqBeforeStart:blocked'; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.choristers (church_id, sabbath_date, name, phone) values (ch, d, 'Test Chorister', '+254711000901')
    on conflict (church_id, sabbath_date) do update set name = excluded.name, phone = excluded.phone;
  sid := public.start_song_service(ch, 120); r := r || ' start:ok';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', fu, 'role','authenticated')::text, true);
  set local role authenticated;
  a := public.request_song(ch, null, 245, false);
  b := public.request_song(ch, null, 245, false); r := r || ' dupSame:' || (a = b);
  perform public.request_song(ch, null, 100, true);
  begin perform public.request_song(ch, null, 300, false); r := r || ' limit:NOTHIT'; exception when others then r := r || ' limit:' || sqlerrm; end;
  begin perform public.update_song_service(sid, false, null); r := r || ' fpause:ALLOWED'; exception when others then r := r || ' fpause:blocked'; end;
  v := public.song_service_view(ch);
  r := r || ' f.canLead:' || (v->>'canLead') || ' f.mine:' || jsonb_array_length(v->'mine') || ' f.names:' || coalesce(v->'queue'->0->>'requesters','null');
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ou, 'role','authenticated')::text, true);
  set local role authenticated;
  begin perform public.request_song(ch, null, 5, false); r := r || ' outsider:ALLOWED'; exception when others then r := r || ' outsider:blocked'; end;
  begin perform public.set_song_status(sid, array[a], 'sung'); r := r || ' outsiderLead:ALLOWED'; exception when others then r := r || ' outsiderLead:blocked'; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', cu, 'role','authenticated')::text, true);
  set local role authenticated;
  v := public.song_service_view(ch);
  r := r || ' c.canLead:' || (v->>'canLead') || ' c.chor:' || (v->>'chorister');
  r := r || ' c.names:' || (select string_agg(coalesce(q->'requesters'->0->>'name','anon'), ',') from jsonb_array_elements(v->'queue') q);
  perform public.set_song_status(sid, array[a], 'next');
  perform public.add_manual_song(sid, null, null, 'Amazing Grace');
  perform public.update_song_service(sid, false, 3);
  v := public.song_service_view(ch);
  r := r || ' next:' || (select q->>'number' from jsonb_array_elements(v->'queue') q where q->>'status' = 'next');
  r := r || ' paused:' || (v->'session'->>'accepting') || ' rows:' || jsonb_array_length(v->'queue');
  perform public.set_song_status(sid, array[a], 'sung');
  perform public.end_song_service(sid);
  begin perform public.set_song_status(sid, array[a], 'requested'); r := r || ' chorAfterEnd:ALLOWED'; exception when others then r := r || ' chorAfterEnd:blocked'; end;
  v := public.song_service_view(ch); r := r || ' c.canLeadAfter:' || (v->>'canLead');
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', fu, 'role','authenticated')::text, true);
  set local role authenticated;
  v := public.song_service_view(ch);
  r := r || ' f.live:' || (v->'session'->>'live') || ' f.sung:' || (select r2->>'status' from jsonb_array_elements(v->'mine') r2 where r2->>'number' = '245');
  begin perform public.request_song(ch, null, 7, false); r := r || ' afterEnd:ALLOWED'; exception when others then r := r || ' afterEnd:blocked'; end;
  reset role;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  v := public.song_service_view(ch); r := r || ' anon.view:' || (v ? 'session') || ' anon.req:' || (v->>'canRequest');
  begin perform count(*) from public.choristers; r := r || ' anonChor:ALLOWED'; exception when others then r := r || ' anonChor:blocked'; end;
  reset role;

  -- erasure clears the chorister phone
  perform set_config('request.jwt.claims', json_build_object('sub', cu, 'role','authenticated')::text, true);
  set local role authenticated;
  perform public.delete_my_account();
  reset role;
  select count(*) into n from public.choristers where church_id = ch and sabbath_date = d and phone is null;
  r := r || ' erasedPhone:' || n;
  raise exception 'RESULT %', r;
end $$;
