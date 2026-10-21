-- An application is decided once its church leaves "pending", however that
-- happens (the platform panel, or staff editing the row in the dashboard).
-- Without this, a church verified outside the panel stayed in the review queue.

create function private.close_applications() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  update public.church_applications
     set decided_at = now()
   where church_id = new.id and decided_at is null;
  return null;
end;
$$;

create trigger churches_close_applications
  after update of status on public.churches
  for each row
  when (old.status = 'pending' and new.status <> 'pending')
  execute function private.close_applications();

-- Close applications already left open that way.
update public.church_applications a
   set decided_at = coalesce(c.verified_at, now())
  from public.churches c
 where c.id = a.church_id and a.decided_at is null and c.status <> 'pending';
