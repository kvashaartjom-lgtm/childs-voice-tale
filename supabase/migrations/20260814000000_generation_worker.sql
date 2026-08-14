-- Phase 2b-1 — async generation worker foundation.
--
-- Builds a SECOND, independent generation pipeline next to the existing
-- prototype one (book_jobs -> generate-character/generate-page, driven by
-- src/routes/voorbeeld.tsx's browser useEffect loop). That pipeline is
-- untouched by this migration — not renamed, not deprecated, not migrated.
--
-- This pipeline: generation_jobs -> pg_cron -> pg_net -> generation-worker
-- Edge Function -> provider adapter -> Storage ("book-pages" bucket) ->
-- book_pages.image_storage_key. It makes generation survive the browser
-- closing (AD-009) by moving orchestration entirely server-side.
--
-- generation_jobs itself already exists (20260813000000_phase0_core_domain.sql,
-- now applied to production) with the right shape. This migration only adds
-- what the worker's atomic claim mechanism needs on top of it.

-- ============================================================================
-- 1. generation_jobs: lease column for the atomic claim
-- ============================================================================

alter table public.generation_jobs
  add column if not exists locked_at timestamptz null;

comment on column public.generation_jobs.locked_at is
  'Set by claim_generation_job() when a worker tick claims this job; cleared when the tick finishes (success, voluntary yield, or terminal failure). A stale non-null value older than the claim lease means a run died without releasing it, and the job becomes reclaimable again.';

-- Partial index: only queued/generating rows are ever relevant to the claim
-- query, and those are a small, ever-changing subset of eventually
-- completed/failed rows.
create index if not exists idx_generation_jobs_claimable
  on public.generation_jobs (job_type, status, created_at)
  where status in ('queued', 'generating');

-- ============================================================================
-- 2. ATOMIC CLAIM
-- ============================================================================
-- Mechanism: a single UPDATE statement whose WHERE clause targets exactly
-- the row selected by a subquery using `FOR UPDATE SKIP LOCKED`. Postgres
-- evaluates the subquery first, taking a row lock on the one candidate row
-- it picks; `SKIP LOCKED` means a concurrent transaction that already holds
-- a lock on some other candidate row is invisible to this scan, so two
-- ticks running at the same moment can never select the same row. The
-- outer UPDATE then applies to exactly that locked row and returns it.
-- This is the standard Postgres "SELECT ... FOR UPDATE SKIP LOCKED" queue
-- idiom, not something bespoke — see the report for why it's safe under
-- overlapping cron ticks.
--
-- Reclaims two kinds of rows: `status = 'queued'` (never started), and
-- `status = 'generating' with an expired/absent lease` (a previous run
-- either voluntarily released it — see the worker's budget-exceeded path —
-- or crashed without releasing it, and the lease has since expired). This
-- is what makes a long book resume across cron ticks instead of restarting
-- or being stuck forever behind a dead worker invocation.
create or replace function public.claim_generation_job(
  p_job_type text default 'page',
  p_lease_seconds int default 180
)
returns public.generation_jobs
language plpgsql
set search_path = ''
as $$
declare
  v_job public.generation_jobs;
begin
  update public.generation_jobs
  set status = 'generating',
      locked_at = now(),
      updated_at = now()
  where id = (
    select gj.id
    from public.generation_jobs gj
    where gj.job_type = p_job_type
      and (
        gj.status = 'queued'
        or (
          gj.status = 'generating'
          and (gj.locked_at is null or gj.locked_at < now() - make_interval(secs => p_lease_seconds))
        )
      )
    order by gj.created_at
    limit 1
    for update skip locked
  )
  returning * into v_job;

  return v_job; -- NULL when no claimable job exists — the worker's cheap no-op path
end;
$$;

comment on function public.claim_generation_job(text, int) is
  'Atomically claims and returns at most one claimable generation_jobs row (queued, or generating with an expired lease) of the given job_type, or NULL if none. SECURITY INVOKER is deliberate: its only legitimate caller is the service-role worker, which already bypasses RLS on the underlying table — no privilege escalation is needed, unlike the Phase 0 owns_*() RLS helpers.';

-- Not SECURITY DEFINER: the only intended caller is the service-role worker,
-- which already has full table access. Grants still restrict who may call
-- it at all, consistent with the rest of this project's functions.
revoke execute on function public.claim_generation_job(text, int) from public;
grant execute on function public.claim_generation_job(text, int) to service_role;

-- ============================================================================
-- 3. STORAGE — dedicated bucket for this pipeline's page images
-- ============================================================================
-- Deliberately NOT the legacy "pages" bucket (that one is keyed by
-- book_jobs.id and belongs entirely to the untouched prototype pipeline).
-- This bucket is keyed by book_version_id: "<book_version_id>/<NN>.<ext>".
-- Private, no public/anon access; written only by the service-role worker.
-- No read policy is added here — nothing in this task's scope reads these
-- images back to a browser yet (that's later frontend-wiring work).
insert into storage.buckets (id, name, public)
values ('book-pages', 'book-pages', false)
on conflict (id) do nothing;

-- ============================================================================
-- 4. SCHEDULING — pg_cron + pg_net, every minute
-- ============================================================================
-- pg_cron and pg_net are Supabase platform extensions, typically already
-- enabled project-wide; these statements are idempotent no-ops if so.
create extension if not exists pg_cron with schema cron;
create extension if not exists pg_net with schema net;

-- Authorisation: the worker requires a service_role-signed request (see
-- generation-worker/index.ts's isServiceRoleToken check). The cron job body
-- below reads that key from Supabase Vault by name at CALL TIME via the
-- `vault.decrypted_secrets` view — it is never embedded as plaintext here,
-- and this migration file (committed to git) never contains the real key.
--
-- MANUAL STEP REQUIRED — this migration cannot do this for you, because
-- doing so would mean committing the real secret to the repository. Before
-- this cron job can successfully authorise a single call, the project
-- owner must run once, in the SQL editor (NOT saved as a migration):
--
--   select vault.create_secret(
--     '<the real service_role key, copied from Project Settings>',
--     'generation_worker_invoke_key'
--   );
--
-- Until that secret exists, every tick's call to generation-worker will be
-- rejected with 403 (the Authorization header will carry no valid token) —
-- a loud, visible failure in the Edge Function logs, not silent data loss.
select cron.schedule(
  'generation-worker-tick',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://ffgbslqxuvcvbaolxybq.supabase.co/functions/v1/generation-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'generation_worker_invoke_key'
        limit 1
      )
    ),
    body := jsonb_build_object('trigger', 'cron', 'ts', now())
  ) as request_id;
  $cron$
);
