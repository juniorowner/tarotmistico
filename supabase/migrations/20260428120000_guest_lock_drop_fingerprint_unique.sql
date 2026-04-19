-- fingerprint_hash (UA + idioma + timezone + …) colide entre dispositivos diferentes com
-- config semelhante. UNIQUE em fingerprint bloqueava utilizadores legítimos com 403 antes da IA.
-- O bloqueio principal passa a ser só token_hash (único por aparelho / perfil de browser).

alter table public.guest_device_locks
  drop constraint if exists guest_device_locks_fingerprint_hash_key;

create index if not exists guest_device_locks_fingerprint_hash_idx
  on public.guest_device_locks (fingerprint_hash);

comment on table public.guest_device_locks is
  'Bloqueio server-side: 1 consulta completa anónima por deviceToken (token_hash único). fingerprint_hash é sinalização/analytics, não chave única.';
