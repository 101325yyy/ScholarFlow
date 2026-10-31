-- ScholarFlow Cloud / Supabase PostgreSQL schema, release 2026.10.4.
-- Run once in the Supabase SQL Editor under the project owner account.
-- Each account has one versioned JSON snapshot. Browser PDF bytes are NOT in this table.

create table if not exists public.scholarflow_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision >= 1),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint scholarflow_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint scholarflow_payload_limit check (octet_length(payload::text) <= 4000000)
);

alter table public.scholarflow_snapshots enable row level security;

-- No guest role access to records or columns.
revoke all on table public.scholarflow_snapshots from public, anon;
grant select, insert, update on table public.scholarflow_snapshots to authenticated;

-- Policies are idempotent for reruns.
drop policy if exists sf_cloud_select_own on public.scholarflow_snapshots;
drop policy if exists sf_cloud_insert_own on public.scholarflow_snapshots;
drop policy if exists sf_cloud_update_own on public.scholarflow_snapshots;
create policy sf_cloud_select_own on public.scholarflow_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
create policy sf_cloud_insert_own on public.scholarflow_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sf_cloud_update_own on public.scholarflow_snapshots
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Protect revision integrity and ownership against malformed clients.
create or replace function public.scholarflow_check_snapshot_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot change';
  end if;
  if new.revision <> old.revision + 1 then
    raise exception 'revision must increment exactly once';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.scholarflow_check_snapshot_update() from public, anon, authenticated;
drop trigger if exists sf_cloud_revision_guard on public.scholarflow_snapshots;
create trigger sf_cloud_revision_guard
before update on public.scholarflow_snapshots
for each row execute function public.scholarflow_check_snapshot_update();

-- Prevent unauthenticated users from querying the table: tested by RLS policies.
-- No DELETE policy: accidental remote deletion is intentionally disabled.

-- v2026.11.1: private PDF objects (never automatically uploaded, no public access).
-- Keep bucket private and cap each individual PDF at 30 MiB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scholarflow-pdfs', 'scholarflow-pdfs', false, 31457280, array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=31457280,
  allowed_mime_types=array['application/pdf'];

-- Storage object paths: <auth.uid()>/<literature-record-id>.pdf
-- No UPDATE or DELETE policy: existing copies are not silently replaced or removed.
drop policy if exists sf_pdf_select_own on storage.objects;
drop policy if exists sf_pdf_insert_own on storage.objects;
create policy sf_pdf_select_own on storage.objects
  for select to authenticated
  using (bucket_id='scholarflow-pdfs' and (storage.foldername(name))[1]=(select auth.uid())::text
    and array_length(storage.foldername(name),1)=1
    and storage.filename(name) ~ '^[A-Za-z0-9_-]{1,120}\.pdf$');
create policy sf_pdf_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id='scholarflow-pdfs' and (storage.foldername(name))[1]=(select auth.uid())::text
    and lower(storage.extension(name))='pdf'
    and array_length(storage.foldername(name),1)=1
    and storage.filename(name) ~ '^[A-Za-z0-9_-]{1,120}\.pdf$');
