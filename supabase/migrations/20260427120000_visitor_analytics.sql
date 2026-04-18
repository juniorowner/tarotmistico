-- Sessões e eventos de funil (apenas service role / Edge Functions; RLS sem policies = bloqueado a clientes)

create table if not exists public.visitor_sessions (
  id uuid primary key,
  visitor_client_id text not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  user_agent text,
  language text,
  referrer text,
  entry_path text,
  screen_w int,
  screen_h int,
  viewport_w int,
  viewport_h int,
  utm jsonb not null default '{}'::jsonb,
  is_authenticated boolean not null default false,
  auth_user_id uuid,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists visitor_sessions_last_seen_idx on public.visitor_sessions (last_seen_at desc);
create index if not exists visitor_sessions_visitor_idx on public.visitor_sessions (visitor_client_id);

create table if not exists public.visitor_events (
  id bigserial primary key,
  session_id uuid not null references public.visitor_sessions (id) on delete cascade,
  recorded_at timestamptz not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists visitor_events_session_time_idx on public.visitor_events (session_id, recorded_at);

alter table public.visitor_sessions enable row level security;
alter table public.visitor_events enable row level security;
