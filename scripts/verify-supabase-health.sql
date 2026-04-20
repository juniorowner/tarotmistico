-- Cole no Supabase → SQL Editor (projeto certo).
-- Só leitura / diagnóstico — não altera dados.
--
-- Se no Dashboard não aparecer a migration "20260428120000_guest_lock_drop_fingerprint_unique",
-- ela pode não ter sido aplicada (ex.: falha da CLI). Aplique manualmente o ficheiro no repo:
--   supabase/migrations/20260428120000_guest_lock_drop_fingerprint_unique.sql

-- 1) Tabelas críticas guest / analytics existem?
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'guest_device_locks',
    'guest_ip_daily_counts',
    'guest_questions',
    'reading_consults',
    'visitor_sessions',
    'visitor_events',
    'credit_orders',
    'profiles'
  )
order by table_name;

-- 2) guest_device_locks: deve existir UNIQUE só em token_hash (não em fingerprint_hash).
select c.conname, c.contype, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'guest_device_locks'
order by c.conname;

-- Esperado: uma constraint UNIQUE em token_hash.
-- Se ainda aparecer UNIQUE em fingerprint_hash, falta aplicar a migration 20260428120000.

-- 3) Índice em fingerprint (não único) após migration correta
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'guest_device_locks'
order by indexname;

-- 4) Contagens rápidas (últimos dias dependem do tráfego)
select (select count(*) from public.guest_device_locks) as guest_locks,
       (select count(*) from public.guest_questions) as guest_questions;

-- 5) Grants mínimos (service_role em tabelas guest — migration 20260424120000)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('guest_device_locks', 'guest_questions')
  and grantee = 'service_role'
order by table_name, privilege_type;
