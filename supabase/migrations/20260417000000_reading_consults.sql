-- Consulta = tiragem completa (todas as cartas reveladas). Quota/crédito debitam aqui, não só ao pedir IA.

create table if not exists public.reading_consults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  spread_id text not null,
  spread_name text not null,
  cards jsonb not null default '[]'::jsonb,
  used_credit boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists reading_consults_user_created_idx
  on public.reading_consults (user_id, created_at desc);

comment on table public.reading_consults is 'Uma linha por consulta concluída (cartas reveladas); define quota diária e débito de créditos.';

alter table public.reading_consults enable row level security;

create policy "reading_consults_select_own"
  on public.reading_consults for select
  using (auth.uid() = user_id);

alter table public.ai_readings
  add column if not exists reading_consult_id uuid references public.reading_consults (id) on delete set null;

create unique index if not exists ai_readings_one_per_consult_idx
  on public.ai_readings (reading_consult_id)
  where reading_consult_id is not null;
