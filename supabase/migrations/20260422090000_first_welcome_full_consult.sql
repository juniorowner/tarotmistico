-- Primeira consulta completa grátis (inclui IA) por utilizador.

alter table public.profiles
  add column if not exists first_free_full_consult_used boolean not null default false;

comment on column public.profiles.first_free_full_consult_used is
  'Marca se o utilizador já usou a primeira consulta completa grátis (inclui IA).';

alter table public.reading_consults
  add column if not exists welcome_free_ai boolean not null default false;

comment on column public.reading_consults.welcome_free_ai is
  'True quando a consulta usou a oferta única de boas-vindas (consulta completa com IA).';
