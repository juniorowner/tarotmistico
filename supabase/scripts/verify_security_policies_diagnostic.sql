-- Correr no SQL Editor se verify_security_rls_policies.sql marcar falha em políticas.
-- Lista todas as políticas; a coluna affects_api_clients indica se anon/authenticated/public
-- (ou todos os roles, polroles vazio) estão abrangidos — é aí que INSERT/UPDATE seria brecha.

select c.relname as table_name,
       pol.polname as policy_name,
       pol.polcmd as cmd_char,
       case pol.polcmd
         when 'r' then 'SELECT'
         when 'a' then 'INSERT'
         when 'w' then 'UPDATE'
         when 'd' then 'DELETE'
         when '*' then 'ALL'
         else pol.polcmd::text
       end as command_label,
       case
         when coalesce(cardinality(pol.polroles), 0) = 0 then '— todos os roles —'
         else coalesce(
           (
             select string_agg(r.rolname::text, ', ' order by r.rolname)
             from unnest(pol.polroles) as role_oid(oid)
             join pg_roles r on r.oid = role_oid.oid
           ),
           '(sem roles)'
         )
       end as applies_to_roles,
       (
         coalesce(cardinality(pol.polroles), 0) = 0
         or exists (
           select 1
           from unnest(pol.polroles) as role_oid(oid)
           join pg_roles r on r.oid = role_oid.oid
           where r.rolname in ('anon', 'authenticated', 'public')
         )
       ) as affects_api_clients
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'credit_orders',
    'credit_ledger',
    'profiles',
    'reading_consults',
    'ai_readings'
  ])
order by 1, 2;

-- Apenas políticas perigosas para a API (não-SELECT + anon/authenticated/public ou todos os roles):
select c.relname as table_name,
       pol.polname as policy_name,
       case pol.polcmd
         when 'r' then 'SELECT'
         when 'a' then 'INSERT'
         when 'w' then 'UPDATE'
         when 'd' then 'DELETE'
         when '*' then 'ALL'
         else pol.polcmd::text
       end as command_label
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'credit_orders',
    'credit_ledger',
    'profiles',
    'reading_consults',
    'ai_readings'
  ])
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
order by 1, 2;
