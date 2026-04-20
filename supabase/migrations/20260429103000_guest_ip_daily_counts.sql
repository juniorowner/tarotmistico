-- Limite de consultas guest completas por IP por dia (UTC), além do bloqueio por deviceToken.
-- Reduz abuso em aba anónima (novo token a cada sessão; IP costuma ser o mesmo).

create table if not exists public.guest_ip_daily_counts (
  ip_hash text not null,
  day_utc date not null,
  completions int not null default 0,
  primary key (ip_hash, day_utc)
);

comment on table public.guest_ip_daily_counts is
  'Contador diário (UTC) de interpretações guest concluídas por IP (hash). Usado pela edge guest-interpret-once.';

alter table public.guest_ip_daily_counts enable row level security;
