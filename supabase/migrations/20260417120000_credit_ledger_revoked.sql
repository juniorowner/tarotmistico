-- Consultas revogadas não contam na quota; histórico de créditos para o utilizador.

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

create policy "credit_ledger_select_own"
  on public.credit_ledger for select
  using (auth.uid() = user_id);
