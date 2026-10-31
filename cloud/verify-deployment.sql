-- ScholarFlow Cloud 2026.11.2: read-only post-deployment configuration review.
-- Run in the Supabase project SQL Editor as an administrator.
-- These checks inspect policy definitions. They do NOT prove authenticated
-- per-user denial without separate non-admin test sessions.
select 'snapshots table RLS' as test, rowsecurity as ok
from pg_tables where schemaname='public' and tablename='scholarflow_snapshots';

select 'snapshot policies' as test, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='scholarflow_snapshots'
order by policyname;

select 'PDF storage policies' as test, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='storage' and tablename='objects'
  and policyname in ('sf_pdf_select_own','sf_pdf_insert_own')
order by policyname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id='scholarflow-pdfs';

select 'unsafe snapshot anon table grant' as test,
  has_table_privilege('anon','public.scholarflow_snapshots','SELECT') as anon_select_granted,
  has_table_privilege('anon','public.scholarflow_snapshots','INSERT') as anon_insert_granted,
  has_table_privilege('anon','public.scholarflow_snapshots','UPDATE') as anon_update_granted;
-- Expected: all three anon_* columns false.
-- Separately run an actual two-account RLS negative test and PDF cross-user
-- read denial with two authenticated non-admin sessions before production use.
