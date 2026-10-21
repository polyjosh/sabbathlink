-- Indexes for the remaining columns that reference auth.users, so deleting an
-- account (which cascades or nulls these) doesn't scan whole tables.
create index announcements_posted_by_idx on public.announcements (posted_by);
create index audit_log_actor_idx on public.audit_log (actor_id);
create index churches_verified_by_idx on public.churches (verified_by);
create index payment_change_requests_requested_by_idx on public.payment_change_requests (requested_by);
create index payment_change_requests_approved_by_idx on public.payment_change_requests (approved_by);
create index programmes_updated_by_idx on public.programmes (updated_by);
