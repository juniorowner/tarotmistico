-- Corrige exposição da tabela profiles no Data API
-- Garante que cada usuário só possa ler o próprio perfil.

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);
