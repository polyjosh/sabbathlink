-- One SELECT policy per table and role: the platform-admin read rules from
-- the previous migration are folded into each table's existing read policy
-- (Postgres evaluates every permissive policy, so pairs cost double).

drop policy "platform reads profiles" on public.profiles;
drop policy "own profile" on public.profiles;
create policy "own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_platform_admin());

drop policy "platform admins see each other" on public.platform_admins;
drop policy "platform admins listed to themselves" on public.platform_admins;
create policy "platform admins listed" on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());

drop policy "platform reads teams" on public.church_admins;
drop policy "team visible to fellow admins" on public.church_admins;
create policy "team visible to fellow admins" on public.church_admins for select to authenticated
  using (private.is_church_admin(church_id) or user_id = (select auth.uid()) or private.is_platform_admin());

drop policy "platform reads follows" on public.follows;
drop policy "read own follows" on public.follows;
create policy "read own follows" on public.follows for select to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());

drop policy "platform reads programmes" on public.programmes;
drop policy "published programmes are public" on public.programmes;
create policy "published programmes are public" on public.programmes for select to anon, authenticated
  using (status = 'published' or private.has_capability(church_id, 'programme.edit') or private.is_platform_admin());

drop policy "platform reads items" on public.programme_items;
drop policy "items follow programme" on public.programme_items;
create policy "items follow programme" on public.programme_items for select to anon, authenticated
  using (exists (select 1 from public.programmes p where p.id = programme_id
                 and (p.status = 'published' or private.has_capability(p.church_id, 'programme.edit')
                      or private.is_platform_admin())));

drop policy "platform reads roles" on public.programme_roles;
drop policy "roles follow programme" on public.programme_roles;
create policy "roles follow programme" on public.programme_roles for select to anon, authenticated
  using (exists (select 1 from public.programme_items i join public.programmes p on p.id = i.programme_id
                 where i.id = item_id
                   and (p.status = 'published' or private.has_capability(p.church_id, 'programme.edit')
                        or private.is_platform_admin())));

drop policy "platform reads announcements" on public.announcements;
drop policy "live announcements are public" on public.announcements;
create policy "live announcements are public" on public.announcements for select to anon, authenticated
  using (hide_after is null or hide_after > now() or private.has_capability(church_id, 'posts.edit')
         or private.is_platform_admin());

drop policy "platform reads categories" on public.giving_categories;
drop policy "categories of verified churches" on public.giving_categories;
create policy "categories of verified churches" on public.giving_categories for select to anon, authenticated
  using (private.church_is_verified(church_id) or private.has_capability(church_id, 'giving.view')
         or private.is_platform_admin());

drop policy "platform reads methods" on public.payment_methods;
drop policy "methods of verified churches" on public.payment_methods;
create policy "methods of verified churches" on public.payment_methods for select to anon, authenticated
  using (private.church_is_verified(church_id) or private.has_capability(church_id, 'giving.view')
         or private.is_platform_admin());

drop policy "platform reads accounts" on public.payment_method_accounts;
drop policy "accounts of verified churches" on public.payment_method_accounts;
create policy "accounts of verified churches" on public.payment_method_accounts for select to anon, authenticated
  using (exists (select 1 from public.payment_methods m where m.id = method_id
                 and (private.church_is_verified(m.church_id) or private.has_capability(m.church_id, 'giving.view')
                      or private.is_platform_admin())));

drop policy "platform reads payment changes" on public.payment_change_requests;
drop policy "giving admins see requests" on public.payment_change_requests;
create policy "giving admins see requests" on public.payment_change_requests for select to authenticated
  using (private.has_capability(church_id, 'giving.view') or private.is_platform_admin());
