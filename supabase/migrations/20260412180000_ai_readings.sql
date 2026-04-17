-- Histórico de interpretações geradas pela IA (escrita pela Edge Function com service role)
create table if not exists public.ai_readings (
  id uuid primary key default gen_random_uuid(),
  spread_id text not null,
  spread_name text not null,
  question text,
  cards jsonb not null default '[]'::jsonb,
  ai_interpretation text not null,
  model_used text,
  created_at timestamptz not null default now()
);

comment on table public.ai_readings is 'Leituras interpretadas pela Edge Function interpret-reading';

create index if not exists ai_readings_created_at_idx on public.ai_readings (created_at desc);

alter table public.ai_readings enable row level security;
