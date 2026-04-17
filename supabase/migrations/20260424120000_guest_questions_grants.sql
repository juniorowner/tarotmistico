-- Privilégios explícitos para a Edge Function (service_role) gravar visitantes.
-- Em alguns projetos, tabelas novas sem GRANT podem falhar no PostgREST mesmo com bypass de RLS.
grant usage on schema public to service_role;

grant select, insert, update, delete on table public.guest_questions to service_role;
grant select, insert, update, delete on table public.guest_device_locks to service_role;
grant select, insert, update, delete on table public.ai_readings to service_role;
