-- Correção manual (SQL Editor): preenche lacunas detetadas pelo verify_schema_against_migrations.sql
-- Ordem: diary + trigger → reading_consults → credit_ledger/revoked.
-- Idempotente: pode voltar a correr; usa IF NOT EXISTS e DROP POLICY IF EXISTS onde faz falta.

-- ---------------------------------------------------------------------------
-- Trechos em falta de 20260413120000_auth_profiles_diary (sem recriar profiles)
-- ---------------------------------------------------------------------------

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  spread_name text not null,
  spread_emoji text,
  labels text[] not null default '{}',
  cards jsonb not null default '[]'::jsonb,
  note text not null default '',
  reading_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists diary_entries_user_reading_date_idx
  on public.diary_entries (user_id, reading_date desc);

comment on table public.diary_entries is 'Leituras salvas pelo usuário autenticado';

alter table public.diary_entries enable row level security;

drop policy if exists "diary_select_own" on public.diary_entries;
create policy "diary_select_own"
  on public.diary_entries for select
  using (auth.uid() = user_id);

drop policy if exists "diary_insert_own" on public.diary_entries;
create policy "diary_insert_own"
  on public.diary_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "diary_update_own" on public.diary_entries;
create policy "diary_update_own"
  on public.diary_entries for update
  using (auth.uid() = user_id);

drop policy if exists "diary_delete_own" on public.diary_entries;
create policy "diary_delete_own"
  on public.diary_entries for delete
  using (auth.uid() = user_id);

alter table public.ai_readings
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists ai_readings_user_created_idx
  on public.ai_readings (user_id, created_at desc);

drop policy if exists "ai_readings_select_own" on public.ai_readings;
create policy "ai_readings_select_own"
  on public.ai_readings for select
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, credits)
  values (new.id, 0)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 20260417000000_reading_consults.sql
-- ---------------------------------------------------------------------------

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

drop policy if exists "reading_consults_select_own" on public.reading_consults;
create policy "reading_consults_select_own"
  on public.reading_consults for select
  using (auth.uid() = user_id);

alter table public.ai_readings
  add column if not exists reading_consult_id uuid references public.reading_consults (id) on delete set null;

create unique index if not exists ai_readings_one_per_consult_idx
  on public.ai_readings (reading_consult_id)
  where reading_consult_id is not null;

-- ---------------------------------------------------------------------------
-- 20260417120000_credit_ledger_revoked.sql
-- ---------------------------------------------------------------------------

alter table public.reading_consults
  add column if not exists revoked_at timestamptz;

comment on column public.reading_consults.revoked_at is 'Preenchido se a consulta foi anulada (ex.: falha da IA); deixa de contar nas 3 grátis/dia.';

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credits_delta integer not null,
  balance_after integer not null,
  event_type text not null,
  summary text not null,
  ref_table text,
  ref_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger (user_id, created_at desc);

comment on table public.credit_ledger is 'Histórico: compras, uso grátis/pago em consultas, devoluções.';

alter table public.credit_ledger enable row level security;

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own"
  on public.credit_ledger for select
  using (auth.uid() = user_id);
