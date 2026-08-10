create table if not exists public.book_jobs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  style_id     text not null,
  page_count   int  not null,
  status       text not null default 'pending',
  error        text
);
alter table public.book_jobs enable row level security;
-- Политик намеренно нет: доступ только service-role из Edge Functions.

insert into storage.buckets (id, name, public)
values ('characters','characters',false), ('pages','pages',false)
on conflict (id) do nothing;
