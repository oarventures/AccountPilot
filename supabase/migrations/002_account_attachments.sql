-- Bounded prototype attachment support. A private object store is preferable for larger production files.
begin;
alter table public.workspaces drop constraint workspaces_payload_check;
alter table public.workspaces add constraint workspaces_payload_check check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=24000000);
commit;
