-- Verification letters (CLAUDE.md, "Church verification").
-- The applicant uploads the letter to a private bucket under a folder named
-- after their own user id, then register_church links it to the application.
-- Only platform admins can read letters (plus the uploader, their own files);
-- nobody can change or delete them through the API.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('church-letters', 'church-letters', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "upload own letter" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-letters'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "read letters" on storage.objects for select to authenticated
  using (
    bucket_id = 'church-letters'
    and (owner_id = (select auth.uid())::text or (select private.is_platform_admin()))
  );

-- Original file name, so staff know what they are opening.
alter table public.church_applications add column letter_name text
  check (letter_name is null or length(letter_name) <= 200);

-- Same as before, plus the letter: it must be a file the caller uploaded to
-- their own folder in the letters bucket.
create or replace function public.register_church(p jsonb) returns text
  language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  v_phone  text;
  v_name   text;
  v_id     uuid;
  v_slug   text;
  v_title  text := btrim(p ->> 'name');
  v_role   public.admin_role := (p ->> 'role')::public.admin_role;
  v_letter text := nullif(p ->> 'letter_path', '');
  t        jsonb;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if v_title is null or length(v_title) not between 1 and 120 then
    raise exception 'Church name is required' using errcode = '22023';
  end if;
  select phone, nullif(name, '') into v_phone, v_name from public.profiles where id = v_uid;
  if v_phone is null or v_phone !~ '^\+254[17]\d{8}$' then
    raise exception 'A Kenyan phone number is required' using errcode = '22023';
  end if;
  if v_letter is not null and not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'church-letters' and o.name = v_letter
       and o.owner_id = v_uid::text and o.name like v_uid::text || '/%'
  ) then
    raise exception 'Letter not found' using errcode = '22023';
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

  insert into public.church_applications (church_id, applicant_id, applicant_role, letter_path, letter_name)
  values (v_id, v_uid, v_role, v_letter,
          case when v_letter is null then null else left(nullif(btrim(p ->> 'letter_name'), ''), 200) end);

  return v_slug;
end;
$$;
