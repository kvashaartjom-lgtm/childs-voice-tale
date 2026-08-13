# Current State

## Existing foundation
React/TypeScript, TanStack Start/Router, Supabase, Edge Functions, Gemini, story generation, character generation, page generation, order wizard, preview, i18n, temporary photo-processing foundation.

## Mock/incomplete
Real payments, verified webhooks, production order lifecycle, asynchronous backend generation orchestration, product catalog, production fulfillment, shipment integration, adult voice provider, QR audio infrastructure, global tax/country/printer routing.

## Phase 0 / Step 1 — Auth + Core Domain + RLS (done)
Migration `supabase/migrations/20260813000000_phase0_core_domain.sql` adds the core domain
model and its security boundary:

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
  `REVOKE ... FROM public` / `GRANT ... TO authenticated`): `owns_family`, `owns_child`,
  `owns_book`, `owns_book_version`.
- Status columns use `text` + `CHECK`, not enum types (rollback-friendly in migrations).
- `book_pages.image_storage_key` (`text`) replaces the `image_asset_id` name used in
  `docs/11-DATABASE.md` — a deliberate rename, see that file's "Deviation" section. No
  `assets` table exists.
- Legacy `book_jobs` is untouched except for a descriptive `COMMENT ON TABLE`.
- Local-only: `supabase/config.toml` now sets `enable_anonymous_sign_ins = true`. This is
  **not** enabled on the remote project (`ffgbslqxuvcvbaolxybq`) — that is a manual step for
  the project owner to perform in the Supabase dashboard before Step 2. The frontend is not
  wired to call `signInAnonymously()`.

### Known limitation
The new domain tables (`profiles`, `families`, `children`, `books`, `book_versions`,
`book_pages`, `generation_jobs`) have **zero application writers** until Step 2 connects the
generation flow to this model and anonymous sign-in is enabled on the remote project. This is
expected, not a bug.

### Validation status
Migration file was statically reviewed (table/constraint/index/RLS/policy/helper-function
presence, delete-behavior table, protected-path diff). It was **not executed** — Docker image
pulls (`supabase start`, and a plain `postgres:15-alpine` pull as a control test) were blocked
by this environment's outbound network policy (`Forbidden` on every registry blob). Local
Supabase validation was unavailable; migration execution and RLS runtime tests were not
performed.

Update this file after meaningful implementation changes.
