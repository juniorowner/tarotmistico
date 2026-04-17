-- Perfis com créditos + diário na nuvem + vínculo user nas leituras IA

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Créditos para interpretações IA após o limite diário';

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Créditos só alterados via service role (Edge / admin)

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

create policy "diary_select_own"
  on public.diary_entries for select
  using (auth.uid() = user_id);

create policy "diary_insert_own"
  on public.diary_entries for insert
  with check (auth.uid() = user_id);

create policy "diary_update_own"
  on public.diary_entries for update
  using (auth.uid() = user_id);

create policy "diary_delete_own"
  on public.diary_entries for delete
  using (auth.uid() = user_id);

alter table public.ai_readings
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists ai_readings_user_created_idx
  on public.ai_readings (user_id, created_at desc);

create policy "ai_readings_select_own"
  on public.ai_readings for select
  using (user_id is null or auth.uid() = user_id);

-- Novo utilizador → linha em profiles
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
