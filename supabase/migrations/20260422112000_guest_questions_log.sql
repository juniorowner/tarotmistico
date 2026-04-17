create table if not exists public.guest_questions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  fingerprint_hash text not null,
  spread_name text not null,
  question text,
  cards jsonb not null default '[]'::jsonb,
  interpretation text,
  model_used text,
  created_at timestamptz not null default now()
);

create index if not exists guest_questions_created_idx
  on public.guest_questions (created_at desc);

create index if not exists guest_questions_token_idx
  on public.guest_questions (token_hash);

comment on table public.guest_questions is
  'Log de perguntas e interpretações de visitantes anónimos (sem user_id).';

alter table public.guest_questions enable row level security;
