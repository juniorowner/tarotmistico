create table if not exists public.guest_device_locks (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  fingerprint_hash text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.guest_device_locks is
  'Bloqueio server-side para permitir apenas 1 consulta completa anónima por dispositivo/fingerprint.';

alter table public.guest_device_locks enable row level security;
