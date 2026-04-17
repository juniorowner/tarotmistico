-- Remove políticas típicas de demo do Supabase em ai_readings (INSERT aberto + leitura global).
-- Mantém-se apenas a política controlada pela migração (ai_readings_select_own).

drop policy if exists "Anyone can create readings" on public.ai_readings;
drop policy if exists "Anyone can read all readings" on public.ai_readings;
