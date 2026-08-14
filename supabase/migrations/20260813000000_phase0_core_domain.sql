-- Phase 0 / Step 1 — Auth + Core Domain + RLS
--
-- Creates the core domain model: profiles, families, children, books,
-- book_versions, book_pages, generation_jobs. Ownership derives from
-- auth.uid() -> profiles -> families -> children/books -> book_versions
-- -> book_pages/generation_jobs. RLS is enabled on every table below.
--
-- The legacy `book_jobs` table (see 20260810000000_create_book_jobs.sql)
-- is intentionally left untouched except for a marker comment.

-- ============================================================================
-- 1. PROFILES
-- ============================================================================

create table public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  email        text        null,
  display_name text        null,
  country_code text        null,
  locale       text        null,
  currency     text        null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Canonical application identity. One row per auth.users row, created by the on_auth_user_created trigger.';
comment on column public.profiles.email is
  'Denormalized convenience copy of auth.users.email. Nullable and non-unique: anonymous Supabase users have no email.';

alter table public.profiles enable row level security;

-- ============================================================================
-- 2. FAMILIES
-- ============================================================================

create table public.families (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references public.profiles(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.families enable row level security;

create index idx_families_owner_id on public.families(owner_id);

-- ============================================================================
-- 3. CHILDREN
-- ============================================================================

create table public.children (
  id           uuid        primary key default gen_random_uuid(),
  family_id    uuid        not null references public.families(id) on delete cascade,
  display_name text        not null,
  age_bracket  text        null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint children_id_family_id_key unique (id, family_id)
);

comment on table public.children is
  'Child metadata only. Never store photo_url/photo_base64/original photo binary here — see AD-010 and the "Фото ребёнка" section of CLAUDE.md.';

alter table public.children enable row level security;

create index idx_children_family_id on public.children(family_id);

-- ============================================================================
-- 4. BOOKS
-- ============================================================================

create table public.books (
  id         uuid        primary key default gen_random_uuid(),
  family_id  uuid        not null references public.families(id) on delete cascade,
  child_id   uuid        not null,
  title      text        not null,
  language   text        null,
  status     text        not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_status_check check (status in ('draft', 'generating', 'ready', 'archived')),
  -- Composite FK (child_id, family_id) requires both columns NOT NULL: with
  -- MATCH SIMPLE semantics a NULL in either column disables enforcement
  -- entirely, which would make cross-family protection purely decorative.
  constraint books_child_id_family_id_fkey
    foreign key (child_id, family_id) references public.children(id, family_id) on delete cascade
);

comment on constraint books_child_id_family_id_fkey on public.books is
  'Composite FK against children(id, family_id) makes it structurally impossible for a book to reference a child from a different family. Two cascade paths (direct family_id FK + this composite FK) delete the same rows and are both correct.';

alter table public.books enable row level security;

create index idx_books_family_id on public.books(family_id);
create index idx_books_child_id on public.books(child_id);

-- ============================================================================
-- 5. BOOK VERSIONS
-- ============================================================================

create table public.book_versions (
  id             uuid        primary key default gen_random_uuid(),
  book_id        uuid        not null references public.books(id) on delete cascade,
  version_number int         not null,
  status         text        not null default 'draft',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint book_versions_status_check
    check (status in ('draft', 'generating', 'review_ready', 'completed', 'failed', 'cancelled')),
  constraint book_versions_book_id_version_number_key unique (book_id, version_number)
);

alter table public.book_versions enable row level security;

create index idx_book_versions_book_id on public.book_versions(book_id);

-- ============================================================================
-- 6. BOOK PAGES
-- ============================================================================

create table public.book_pages (
  id                 uuid        primary key default gen_random_uuid(),
  book_version_id    uuid        not null references public.book_versions(id) on delete cascade,
  page_number        int         not null,
  text               text        null,
  image_storage_key  text        null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint book_pages_book_version_id_page_number_key unique (book_version_id, page_number)
);

comment on column public.book_pages.image_storage_key is
  'Bucket-relative Storage object path, e.g. pages/<uuid>/03.png. Deliberate rename of the image_asset_id column named in docs/11-DATABASE.md — see docs/31-CURRENT-STATE.md for the recorded deviation. No assets table/entity exists in this phase.';

alter table public.book_pages enable row level security;

create index idx_book_pages_book_version_id on public.book_pages(book_version_id);

-- ============================================================================
-- 7. GENERATION JOBS
-- ============================================================================

create table public.generation_jobs (
  id               uuid        primary key default gen_random_uuid(),
  book_version_id  uuid        not null references public.book_versions(id) on delete cascade,
  job_type         text        not null,
  status           text        not null default 'queued',
  progress         int         not null default 0,
  retry_count      int         not null default 0,
  provider         text        null,
  provider_job_id  text        null,
  error_code       text        null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint generation_jobs_job_type_check check (job_type in ('story', 'character', 'page', 'package')),
  constraint generation_jobs_status_check
    check (status in ('queued', 'generating', 'completed', 'failed', 'cancelled', 'retrying')),
  constraint generation_jobs_progress_check check (progress between 0 and 100),
  constraint generation_jobs_retry_count_check check (retry_count >= 0)
);

comment on table public.generation_jobs is
  'Future asynchronous generation job entity, structurally independent from the legacy prototype book_jobs table.';

alter table public.generation_jobs enable row level security;

create index idx_generation_jobs_book_version_id on public.generation_jobs(book_version_id);

-- ============================================================================
-- 8. updated_at MAINTENANCE
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.families
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.children
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.books
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.book_versions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.book_pages
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.generation_jobs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 9. PROFILE CREATION TRIGGER (auth.users -> profiles)
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'SECURITY DEFINER: creates the profiles row for every new auth.users row, including anonymous sign-ins where NEW.email is NULL. Idempotent via ON CONFLICT DO NOTHING. The frontend must never create its own profile row.';

-- Not granted to anyone: trigger execution does not require an EXECUTE
-- grant on the invoking role, and this function must never be callable
-- directly by application users.
revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 10. RLS HELPER FUNCTIONS
-- ============================================================================
-- SECURITY DEFINER is deliberate: a SECURITY INVOKER helper that queries
-- `families` from inside the RLS policy ON `families` causes infinite policy
-- recursion. SECURITY DEFINER executes with the definer's rights and
-- bypasses RLS on the tables it reads internally, breaking that recursion.
-- The function body is therefore the security boundary: it must compare
-- against (select auth.uid()) and nothing else, and every identifier must
-- be schema-qualified because SET search_path = '' leaves no default schema.

create or replace function public.owns_family(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.families f
    where f.id = p_family_id
      and f.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_family(uuid) from public;
grant  execute on function public.owns_family(uuid) to authenticated;

create or replace function public.owns_book(p_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.books b
    join public.families f on f.id = b.family_id
    where b.id = p_book_id
      and f.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_book(uuid) from public;
grant  execute on function public.owns_book(uuid) to authenticated;

create or replace function public.owns_book_version(p_book_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.book_versions bv
    join public.books b     on b.id = bv.book_id
    join public.families f  on f.id = b.family_id
    where bv.id = p_book_version_id
      and f.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_book_version(uuid) from public;
grant  execute on function public.owns_book_version(uuid) to authenticated;

-- ============================================================================
-- 11. RLS POLICIES
-- ============================================================================
-- Every policy targets `authenticated` only. There is no `anon` policy on
-- any domain table or helper function, so anon has no access path even
-- though Supabase's default table grants exist alongside RLS. Anonymous
-- Supabase users are `authenticated` sessions with a real auth.uid() — they
-- are not `anon` role requests, so this is not a public access path.

-- profiles: SELECT/UPDATE own row only. No INSERT policy (the trigger owns
-- row creation via SECURITY DEFINER). No DELETE policy (account deletion
-- happens through auth.users and cascades).
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- families: owner_id must equal auth.uid() on read, write and the
-- post-write row (WITH CHECK) so a family can never be handed off to
-- another owner_id via UPDATE.
create policy families_select_own on public.families
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy families_insert_own on public.families
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy families_update_own on public.families
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy families_delete_own on public.families
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- children: ownership derives from the parent family via owns_family().
create policy children_select_own on public.children
  for select to authenticated
  using (public.owns_family(family_id));

create policy children_insert_own on public.children
  for insert to authenticated
  with check (public.owns_family(family_id));

create policy children_update_own on public.children
  for update to authenticated
  using (public.owns_family(family_id))
  with check (public.owns_family(family_id));

create policy children_delete_own on public.children
  for delete to authenticated
  using (public.owns_family(family_id));

-- books: ownership derives from family_id. The composite FK already
-- guarantees child_id belongs to the same family_id, so checking family_id
-- ownership alone is sufficient and avoids a redundant join.
create policy books_select_own on public.books
  for select to authenticated
  using (public.owns_family(family_id));

create policy books_insert_own on public.books
  for insert to authenticated
  with check (public.owns_family(family_id));

create policy books_update_own on public.books
  for update to authenticated
  using (public.owns_family(family_id))
  with check (public.owns_family(family_id));

create policy books_delete_own on public.books
  for delete to authenticated
  using (public.owns_family(family_id));

-- book_versions: ownership derives from the parent book via owns_book().
create policy book_versions_select_own on public.book_versions
  for select to authenticated
  using (public.owns_book(book_id));

create policy book_versions_insert_own on public.book_versions
  for insert to authenticated
  with check (public.owns_book(book_id));

create policy book_versions_update_own on public.book_versions
  for update to authenticated
  using (public.owns_book(book_id))
  with check (public.owns_book(book_id));

create policy book_versions_delete_own on public.book_versions
  for delete to authenticated
  using (public.owns_book(book_id));

-- book_pages: ownership derives from the parent book version via
-- owns_book_version().
create policy book_pages_select_own on public.book_pages
  for select to authenticated
  using (public.owns_book_version(book_version_id));

create policy book_pages_insert_own on public.book_pages
  for insert to authenticated
  with check (public.owns_book_version(book_version_id));

create policy book_pages_update_own on public.book_pages
  for update to authenticated
  using (public.owns_book_version(book_version_id))
  with check (public.owns_book_version(book_version_id));

create policy book_pages_delete_own on public.book_pages
  for delete to authenticated
  using (public.owns_book_version(book_version_id));

-- generation_jobs: ownership derives from the parent book version via
-- owns_book_version().
create policy generation_jobs_select_own on public.generation_jobs
  for select to authenticated
  using (public.owns_book_version(book_version_id));

create policy generation_jobs_insert_own on public.generation_jobs
  for insert to authenticated
  with check (public.owns_book_version(book_version_id));

create policy generation_jobs_update_own on public.generation_jobs
  for update to authenticated
  using (public.owns_book_version(book_version_id))
  with check (public.owns_book_version(book_version_id));

create policy generation_jobs_delete_own on public.generation_jobs
  for delete to authenticated
  using (public.owns_book_version(book_version_id));

-- ============================================================================
-- 12. LEGACY book_jobs — marker only, table left completely untouched
-- ============================================================================

comment on table public.book_jobs is
  'LEGACY prototype table. Superseded by generation_jobs. Migration deferred to Phase 0 / Step 2 (browser-independent orchestration).';
