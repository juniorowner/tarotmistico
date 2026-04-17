-- Antes: (user_id is null or auth.uid() = user_id) expunha leituras legadas sem user_id a qualquer sessão.
-- Agora: só o dono da linha vê a interpretação via Data API (Edge Functions continuam com service role).

drop policy if exists "ai_readings_select_own" on public.ai_readings;

create policy "ai_readings_select_own"
  on public.ai_readings for select
  using (auth.uid() = user_id);
