# Current State

## Existing foundation
React/TypeScript, TanStack Start/Router, Supabase, Edge Functions, Gemini, story generation, character generation, page generation, order wizard, preview, i18n, temporary photo-processing foundation.

## Mock/incomplete
Real payments, verified webhooks, production order lifecycle, asynchronous backend generation orchestration, product catalog, production fulfillment, shipment integration, adult voice provider, QR audio infrastructure, global tax/country/printer routing.

## Phase 0 / Step 1 — Auth + Core Domain + RLS (done, applied to production)
Migration `supabase/migrations/20260813000000_phase0_core_domain.sql` adds the core domain
model and its security boundary, and is now **live on production** (project
`ffgbslqxuvcvbaolxybq`, region `eu-north-1` / Stockholm):

- Tables: `profiles`, `families`, `children`, `books`, `book_versions`, `book_pages`,
  `generation_jobs`. All have RLS enabled.
- Ownership chain: `auth.uid()` → `profiles` → `families` → `children`/`books` →
  `book_versions` → `book_pages`/`generation_jobs`.
- `profiles` is created automatically by an `AFTER INSERT ON auth.users` trigger
  (`public.handle_new_user`, `SECURITY DEFINER`), tolerant of `NEW.email IS NULL` for
  anonymous sign-ins. `profiles.email` is nullable and non-unique by design.
- Cross-family integrity: `children(id, family_id)` UNIQUE + composite FK
  `books(child_id, family_id) → children(id, family_id)` makes it structurally impossible
  for a book to reference a child from a different family. `books.family_id` and
  `books.child_id` are both `NOT NULL` (required for the composite FK to be enforced at all).
- RLS helper functions (`SECURITY DEFINER`, `SET search_path = ''`, schema-qualified,
  `REVOKE ... FROM public` / `GRANT ... TO authenticated`): `owns_family`, `owns_book`,
  `owns_book_version`. (`owns_child` was written in the first draft, found to be called by no
  policy, and removed as dead code before the production apply.)
- Status columns use `text` + `CHECK`, not enum types (rollback-friendly in migrations).
- `book_pages.image_storage_key` (`text`) replaces the `image_asset_id` name used in
  `docs/11-DATABASE.md` — a deliberate rename, see that file's "Deviation" section. No
  `assets` table exists.
- Legacy `book_jobs` is untouched except for a descriptive `COMMENT ON TABLE`.
- Anonymous sign-in (`enable_anonymous_sign_ins`) is now **enabled on production**, not just
  in the local `supabase/config.toml`. The frontend is still **not** wired to call
  `signInAnonymously()` — see "Known limitation" below.

### Known limitation
The new domain tables (`profiles`, `families`, `children`, `books`, `book_versions`,
`book_pages`, `generation_jobs`) have **zero application writers**. Anonymous sign-in is
enabled on production, but nothing in the frontend calls `signInAnonymously()` and nothing
writes to the domain model yet — the working prototype still runs entirely on the legacy
`book_jobs` table. Wiring the frontend and generation flow to this model is Step 2.

Generation orchestration is also still browser-driven (`src/routes/voorbeeld.tsx`'s
`useEffect` loop calling `generate-character`/`generate-page` sequentially), which continues
to violate AD-009 ("AI generation is asynchronous and browser-independent") — see
`docs/34-AUDIT.md`. Making orchestration backend-owned and browser-independent, on top of this
new domain model, is also part of Step 2.

### Validation status
The migration was validated against a disposable staging project **twice** — once applied to
an existing schema, once to a freshly created one — using `tools/rls-isolation-test.mjs`
(committed to the repo, run manually by the project owner against a real Supabase project;
never executed by Claude, which has no network access to Supabase hosts). All 10
isolation/constraint steps (cross-user SELECT/UPDATE/DELETE isolation, cross-family
composite-FK rejection, duplicate-version rejection, CHECK-constraint rejection,
CASCADE-on-user-delete) passed both times. Only after both staging runs passed was the
migration applied to production.

Production had no `supabase_migrations` schema at all before this — it was created manually
and seeded with all three existing migration versions (`20250101000000`, `20260810000000`,
`20260813000000`) so the CLI's migration history now matches what was actually run, where
previously no such history existed on production at all.

## Phase 2b-1 — Async worker foundation (backend only, unverified against a live project)
Migration `supabase/migrations/20260814000000_generation_worker.sql` adds a **second,
independent** generation pipeline beside the existing prototype one — it does not touch
`book_jobs`, `generate-character`, `generate-page`, or `src/routes/voorbeeld.tsx`'s
browser-driven loop, which all keep running exactly as before:

- New Edge Function `supabase/functions/generation-worker/` processes queued
  `generation_jobs` rows: claims one job atomically (`claim_generation_job()`, `UPDATE ...
  WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED)`), generates each page's image via a
  provider adapter (`supabase/functions/_shared/image-provider.ts`), writes it to a new
  private Storage bucket (`book-pages`, keyed by `book_version_id`), and sets
  `book_pages.image_storage_key`. Progress updates after every page. Stops after ~100s of
  wall clock and releases its lease so a long book resumes on the next tick instead of
  hitting the function timeout.
- Provider selection via `IMAGE_PROVIDER` env var (AD-004): `mock` (default) produces a
  deterministic SVG that visibly encodes the `book_version_id`/`page_number` it was called
  with; `gemini` is a stub that throws — not configured, not exercised (Gemini's free tier
  is quota-blocked, see `docs/33-DEFERRED.md`).
- Scheduled via `pg_cron` (every minute) calling `pg_net.http_post` against the worker,
  authorised with a `service_role` JWT sourced from Supabase Vault at call time — never
  stored as plaintext in the migration. **Manual owner step still required**: the Vault
  secret (`generation_worker_invoke_key`) must be created once via the SQL editor before any
  cron tick can successfully call the worker — see `docs/35-GENERATION-WORKER-VERIFICATION.md`.
- Transient failures retry up to 3 times (`retry_count`) before the job is marked `failed`;
  permanent validation failures (e.g. no pages to generate) fail immediately without
  retrying, per `docs/12-AI-PIPELINE.md`.

**Not done yet, deliberately out of this task's scope:** nothing creates a `generation_jobs`
row from the frontend — this task validates orchestration only. `voorbeeld.tsx` still does not
call this pipeline; AD-009 compliance for the pipeline the user actually experiences is still
outstanding until that wiring happens.

**Verification status:** Claude has no network path to Supabase and did not run any of this
against a real project — see `docs/35-GENERATION-WORKER-VERIFICATION.md` for the manual
script the owner runs, and the Phase 2b-1 task report for what was checked by other means
(static review, a TypeScript check against a stubbed Deno/supabase-js environment).

Update this file after meaningful implementation changes.
