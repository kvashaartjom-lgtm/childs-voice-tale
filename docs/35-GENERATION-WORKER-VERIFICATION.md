# Generation Worker — Manual Verification (Phase 2b-1)

This is a script for the **project owner** to run against the real Supabase
project. Claude has no network path to Supabase and did not, and could not,
run any of this — see the report for what was verified by other means
(static review, a type-check against a shim, and reasoning about the SQL).

Run these in order. Each step says what to look for and what a pass looks
like. Nothing here touches `book_jobs` or the existing browser-driven
pipeline — this is exclusively the new `generation_jobs` pipeline.

## 0. One-time setup (required before any of this works)

The cron job cannot authorise its call to the worker until the invoke
secret exists in Vault. Run once, in the SQL editor:

```sql
select vault.create_secret(
  '<paste the real service_role key from Project Settings > API>',
  'generation_worker_invoke_key'
);
```

Until this is done, every cron tick will call the worker with an invalid
`Authorization` header and get `403 forbidden` back — check the
`generation-worker` function's logs in the dashboard to confirm this is
what's happening if nothing seems to progress at all.

## 0.5. Sanity check the empty-queue no-op path first

Before creating any test data, confirm the worker's "nothing to do" path
actually behaves like one — this specific behavior rests on an assumption
about Postgres/plpgsql semantics (`claim_generation_job()` returning a true
SQL `NULL`, not a row-shaped object with all-null fields, when no job is
claimable) that could not be executed or verified anywhere in this task.
If it's wrong, the worker would misbehave on *every* empty-queue tick, not
just fail one test — worth ruling out first.

With the `generation_jobs` table currently empty (or all rows
completed/failed), call the function directly:

```sql
select claim_generation_job();
```

Pass: a single row of output showing `NULL` (or an empty result), not a row
of empty-string/zero-ish values. Then invoke the worker itself (with a real
`service_role` bearer token) and confirm the JSON body is exactly
`{"ok":true,"claimed":false}` — not an error, not a body referencing a
job id.

## 1. Create a test job

Insert a family/child/book/book_version/book_pages chain and a queued
`generation_jobs` row directly via SQL (service-role / SQL editor context,
so RLS doesn't get in the way of this manual setup):

```sql
-- Adjust owner_id to a real auth.users id if you want RLS-visible test
-- data; using gen_random_uuid() here only works because this runs with
-- elevated privileges in the SQL editor, bypassing the owner_id FK check
-- being meaningful — prefer a real profile id if you have one handy.
with new_family as (
  insert into families (owner_id, name)
  select id, 'Verification Family' from profiles limit 1
  returning id
), new_child as (
  insert into children (family_id, display_name, age_bracket)
  select id, 'Verification Child', '3-5' from new_family
  returning id
), new_book as (
  insert into books (family_id, child_id, title, language, status)
  select new_family.id, new_child.id, 'Verification Book', 'nl', 'generating'
  from new_family, new_child
  returning id
), new_version as (
  insert into book_versions (book_id, version_number, status)
  select id, 1, 'generating' from new_book
  returning id
), new_pages as (
  insert into book_pages (book_version_id, page_number, text)
  select new_version.id, gs, 'Verification page ' || gs || ' of the test book.'
  from new_version, generate_series(1, 4) as gs
  returning book_version_id
)
insert into generation_jobs (book_version_id, job_type, status)
select distinct book_version_id, 'page', 'queued' from new_pages
returning id, book_version_id;
```

Note the returned `id` (the job id) and `book_version_id` — you'll need
both below. This example uses **4 pages**; use more (e.g. 20-30) if you
specifically want to exercise the ~100-second budget/resumption path in
step 5, since 4 tiny mock pages will finish in well under 100 seconds.

## 2. Confirm pickup timing

pg_cron fires this job's tick every minute (`* * * * *`). Because the tick
you land in depends on when in the current minute you inserted the row, do
**not** expect pickup at any specific second — expect it within roughly
**one cron interval plus however long that tick's own execution takes**
(for a small mock job, a few seconds beyond the next tick). If you insert
just after a tick has already fired, the wait is closer to a full minute;
if you insert just before one, it's closer to instant.

Poll:

```sql
select id, status, progress, retry_count, error_code, locked_at, updated_at
from generation_jobs
where id = '<job id from step 1>';
```

Pass: `status` moves from `queued` to `generating` (and eventually
`completed`) within that window, not instantly and not never.

## 3. Confirm each image encodes its own book_version_id and page_number

Once `book_pages.image_storage_key` is populated for a page:

```sql
select page_number, image_storage_key
from book_pages
where book_version_id = '<book_version_id from step 1>'
order by page_number;
```

Download one via the dashboard's Storage browser (bucket `book-pages`,
path shown in `image_storage_key`) or via the API, and open it — it's an
SVG, so any text editor or browser tab shows it directly, no image tool
needed. Confirm the visible text inside it reads:

```
book_version_id: <the exact book_version_id from step 1>
page_number: <the exact page_number for that row>
```

Pass: every page's file shows *its own* `book_version_id`/`page_number` —
not a placeholder, not another page's values. This is what proves the
worker produced that specific file for that specific job/page, not merely
that some file exists at that path.

## 4. Confirm progress advances incrementally

While the job is still `generating` (use a book with enough pages that
this doesn't finish in one glance — 10+), repeatedly run:

```sql
select progress, updated_at from generation_jobs where id = '<job id>';
```

Pass: you see intermediate values (e.g. 25, 50, 75 for a 4-page book; finer
steps for more pages) between ticks, not a jump straight from 0 to 100.
Each value should be `round(pages_done / total_pages * 100)`.

## 5. Confirm resumption across the ~100-second budget

Use a book with enough pages that generation genuinely can't finish inside
~100 seconds of a single worker tick — with the mock provider's ~0.5-1s
per-page artificial delay, that means roughly 100+ pages. (Alternatively,
temporarily lower `BUDGET_MS` in `generation-worker/index.ts` for a local
test deploy, and revert before shipping — not required, just faster to
observe.)

```sql
select progress, status, locked_at, updated_at from generation_jobs where id = '<job id>';
```

Pass: you observe `progress` stop increasing partway through, `status`
still `generating`, and `locked_at` go back to `null` (the voluntary-yield
release) — then, on the *next* cron tick (roughly a minute later),
`locked_at` gets set again and `progress` resumes climbing from where it
left off, not from 0. This is the resumption path: the same job, not a
duplicate, continuing across two separate function invocations.

## 6. Force a failure and confirm retry_count / eventual failed status

The mock provider has two documented test hooks (`supabase/functions/_shared/image-provider.ts`)
that trigger on the *page text*, not real flakiness:

- `__FORCE_TRANSIENT_ERROR__` — simulates a retryable provider failure.
- `__FORCE_PERMANENT_ERROR__` — simulates a permanent validation failure.

**Transient / retry path:**

```sql
update book_pages
set text = '__FORCE_TRANSIENT_ERROR__'
where book_version_id = '<book_version_id>' and page_number = 1;
```

Reset the job to `queued` if it's not already sitting on that page:

```sql
update generation_jobs set status = 'queued', locked_at = null where id = '<job id>';
```

Poll `generation_jobs`. Pass: each tick that reaches this page increments
`retry_count` by 1 and sets `status` back to `queued` (with `error_code`
showing the simulated message) — repeating for `MAX_RETRIES = 3` attempts,
then on the 4th, `status` becomes `failed` permanently and `retry_count`
stops climbing further.

**Permanent path:**

```sql
update book_pages
set text = '__FORCE_PERMANENT_ERROR__'
where book_version_id = '<a different book_version_id, or reset the job with normal text first>'
  and page_number = 1;
update generation_jobs set status = 'queued', locked_at = null where id = '<job id>';
```

Pass: `status` goes straight to `failed` on the very next tick — `retry_count`
does **not** increment at all, since a permanent failure must not retry
(docs/12-AI-PIPELINE.md).

Clean up afterward by resetting `text` to something real and re-queuing if
you want to re-run earlier steps.

## 7. Confirm the legacy pipeline was not touched

```sql
select count(*) from book_jobs; -- should match whatever it was before this migration — unchanged
```

And in the repo: `git diff --stat` for this change should show no path
under `supabase/functions/generate-character/`, `supabase/functions/generate-page/`,
`src/routes/voorbeeld.tsx`, or `src/lib/photo.ts` — confirmed already in
the task report, worth re-confirming yourself before merging.
