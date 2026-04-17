-- Segurança RLS / políticas (SQL Editor no Supabase).
-- Complementa: supabase/scripts/verify_schema_against_migrations.sql
-- Esperado: todas as linhas com ok = true.

with checks as (
  -- Tabelas sensíveis: só leitura pelo cliente (escrita via service role nas Edge Functions).
  select
    'políticas só SELECT (dados financeiros / consultas)'::text as check_group,
    'sem INSERT/UPDATE/DELETE/ALL para anon|authenticated|public (service_role ignora RLS no Supabase)'::text as check_name,
    not exists (
      select 1
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any (
          array[
            'credit_orders',
            'credit_ledger',
            'profiles',
            'reading_consults',
            'ai_readings'
          ]
        )
        and pol.polcmd is distinct from 'r'
        and (
          coalesce(cardinality(pol.polroles), 0) = 0
          or exists (
            select 1
            from unnest(pol.polroles) as role_oid(oid)
            join pg_roles r on r.oid = role_oid.oid
            where r.rolname in ('anon', 'authenticated', 'public')
          )
        )
    ) as ok

  union all
  select
    'RLS ativo',
    'tabelas de app em public com RLS (relrowsecurity)',
    not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any (
          array[
            'ai_readings',
            'profiles',
            'diary_entries',
            'credit_orders',
            'push_subscriptions',
            'reading_consults',
            'credit_ledger'
          ]
        )
        and not c.relrowsecurity
    )

  union all
  select
    'profiles',
    'FORCE ROW LEVEL SECURITY (relforcerowsecurity)',
    coalesce(
      (
        select c.relforcerowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'profiles'
      ),
      false
    )

  union all
  select
    'ai_readings',
    'sem políticas de demo «Anyone can create/read all readings»',
    not exists (
      select 1
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'ai_readings'
        and pol.polname in (
          'Anyone can create readings',
          'Anyone can read all readings'
        )
    )

  union all
  select
    'ai_readings',
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

  union all
  select
    'auth.users',
    'trigger on_auth_user_created (novos utilizadores → profiles)',
    exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth'
        and c.relname = 'users'
        and not t.tgisinternal
        and t.tgname = 'on_auth_user_created'
    )
)
select
  check_group,
  check_name,
  ok,
  case when ok then 'OK' else 'FALTA — rever migrações / RLS no Dashboard' end as status
from checks
order by check_group, check_name;

-- Se a linha acima "políticas só SELECT" ainda falhar, execute o SELECT seguinte
-- e remova no Dashboard (ou SQL) políticas com command diferente de SELECT numa destas tabelas.
--
-- select c.relname as table_name,
--        pol.polname as policy_name,
--        pol.polcmd as cmd_char,
--        case pol.polcmd
--          when 'r' then 'SELECT'
--          when 'a' then 'INSERT'
--          when 'w' then 'UPDATE'
--          when 'd' then 'DELETE'
--          when '*' then 'ALL'
--          else pol.polcmd::text
--        end as command_label
-- from pg_policy pol
-- join pg_class c on c.oid = pol.polrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relname = any (array[
--     'credit_orders', 'credit_ledger', 'profiles', 'reading_consults', 'ai_readings'
--   ])
-- order by 1, 2;

-- Opcional: listar outras tabelas em public sem RLS (pode incluir lixo ou extensões).
-- select c.relname
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
-- order by 1;
