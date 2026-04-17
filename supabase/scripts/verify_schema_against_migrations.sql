-- Rode no SQL Editor do Supabase. Cada linha: uma assinatura do que as migrações em
-- supabase/migrations esperam. ok = false → essa parte não está no banco (rode a migração
-- correspondente ou o trecho que faltou).

with checks as (
  -- 20260412180000_ai_readings.sql
  select
    '20260412180000_ai_readings'::text as migration_file,
    'public.ai_readings existe'::text as check_name,
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'ai_readings'
    ) as ok
  union all
  select
    '20260412180000_ai_readings',
    'ai_readings.ai_interpretation (coluna)',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_readings' and column_name = 'ai_interpretation'
    )
  union all
  select
    '20260412180000_ai_readings',
    'ai_readings RLS ativo',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'ai_readings'
    ), false)

  union all
  -- 20260413120000_auth_profiles_diary.sql
  select
    '20260413120000_auth_profiles_diary',
    'public.profiles existe',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'profiles'
    )
  union all
  select
    '20260413120000_auth_profiles_diary',
    'public.diary_entries existe',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'diary_entries'
    )
  union all
  select
    '20260413120000_auth_profiles_diary',
    'ai_readings.user_id',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_readings' and column_name = 'user_id'
    )
  union all
  select
    '20260413120000_auth_profiles_diary',
    'trigger auth.users on_auth_user_created',
    exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth' and c.relname = 'users'
        and not t.tgisinternal
        and t.tgname = 'on_auth_user_created'
    )
  union all
  select
    '20260413120000_auth_profiles_diary',
    'função public.handle_new_user',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'handle_new_user'
    )

  union all
  -- 20260415120000_credit_orders.sql
  select
    '20260415120000_credit_orders',
    'public.credit_orders existe',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'credit_orders'
    )
  union all
  select
    '20260415120000_credit_orders',
    'credit_orders.mp_payment_id (coluna)',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'credit_orders' and column_name = 'mp_payment_id'
    )

  union all
  -- 20260415170000_push_subscriptions.sql
  select
    '20260415170000_push_subscriptions',
    'public.push_subscriptions existe',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'push_subscriptions'
    )

  union all
  -- 20260415193000_credit_orders_applied_flag.sql
  select
    '20260415193000_credit_orders_applied_flag',
    'credit_orders.credits_applied',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'credit_orders' and column_name = 'credits_applied'
    )

  union all
  -- 20260416110000_fix_profiles_rls.sql
  select
    '20260416110000_fix_profiles_rls',
    'profiles FORCE RLS (relforcerowsecurity)',
    coalesce((
      select c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'profiles'
    ), false)

  union all
  -- 20260417000000_reading_consults.sql
  select
    '20260417000000_reading_consults',
    'public.reading_consults existe',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'reading_consults'
    )
  union all
  select
    '20260417000000_reading_consults',
    'ai_readings.reading_consult_id',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ai_readings' and column_name = 'reading_consult_id'
    )
  union all
  select
    '20260417000000_reading_consults',
    'índice ai_readings_one_per_consult_idx',
    exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'ai_readings_one_per_consult_idx'
    )

  union all
  -- 20260417120000_credit_ledger_revoked.sql
  select
    '20260417120000_credit_ledger_revoked',
    'reading_consults.revoked_at',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'reading_consults' and column_name = 'revoked_at'
    )
  union all
  select
    '20260417120000_credit_ledger_revoked',
    'public.credit_ledger existe',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'credit_ledger'
    )
  union all
  select
    '20260417120000_credit_ledger_revoked',
    'credit_ledger.event_type (coluna)',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'credit_ledger' and column_name = 'event_type'
    )

  union all
  -- 20260418120000_credit_orders_refunded.sql
  select
    '20260418120000_credit_orders_refunded',
    'credit_orders.refunded_at',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'credit_orders' and column_name = 'refunded_at'
    )
  union all
  select
    '20260418120000_credit_orders_refunded',
    'CHECK status inclui refunded',
    exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'credit_orders'
        and c.conname = 'credit_orders_status_check'
        and pg_get_constraintdef(c.oid) ilike '%refunded%'
    )

  union all
  -- 20260418140000_ai_readings_rls_strict.sql
  select
    '20260418140000_ai_readings_rls_strict',
    'policy ai_readings_select_own não expõe user_id null a todos',
    not exists (
      select 1
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'ai_readings'
        and pol.polname = 'ai_readings_select_own'
        and pol.polcmd = 'r'
        and lower(pg_get_expr(pol.polqual, pol.polrelid)) like '%user_id is null%'
    )
)
select
  migration_file,
  check_name,
  ok,
  case when ok then 'OK' else 'FALTA — aplicar migração ou trecho' end as status
from checks
order by migration_file, check_name;
