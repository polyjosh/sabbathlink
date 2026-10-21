-- A verified church can be suspended by platform staff (for example while a
-- fraud report is investigated). Own migration: a new enum value can't be
-- used in the transaction that adds it.
alter type public.church_status add value if not exists 'suspended';
