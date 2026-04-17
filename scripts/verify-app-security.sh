#!/usr/bin/env bash
# Verificações estáticas no repositório (não precisa de ligação ao Postgres).
# Para RLS/políticas no projeto remoto, correr no SQL Editor:
#   supabase/scripts/verify_security_rls_policies.sql
#   supabase/scripts/verify_schema_against_migrations.sql

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "ERRO: $*" >&2
  exit 1
}

echo "== Verificação de segurança (código local) =="

if grep -RIn --exclude-dir=node_modules --exclude-dir=dist \
  -E 'service_role|SERVICE_ROLE_KEY' \
  src 2>/dev/null; then
  fail "Encontrado service_role / SERVICE_ROLE_KEY em src/ — o browser só pode usar a publishable key."
fi

if grep -RIn --exclude-dir=node_modules --exclude-dir=dist \
  'VITE_.*SECRET|VITE_.*SERVICE' \
  src 2>/dev/null; then
  fail "Variável VITE_* suspeita (não expor secrets com prefixo VITE_)."
fi

# Cliente público: só publishable key (nome do projeto).
if ! grep -q 'VITE_SUPABASE_PUBLISHABLE_KEY' src/integrations/supabase/client.ts 2>/dev/null; then
  fail "Esperado VITE_SUPABASE_PUBLISHABLE_KEY em client.ts."
fi

echo "OK: src/ sem service_role / secrets VITE_*."
echo ""
echo "Próximo passo (manual no Supabase SQL Editor):"
echo "  1) supabase/scripts/verify_security_rls_policies.sql"
echo "  2) supabase/scripts/verify_schema_against_migrations.sql"
echo ""
echo "Edge Functions sensíveis — confirmar secrets no Dashboard:"
echo "  mercadopago-webhook (MERCADOPAGO_WEBHOOK_SECRET na query),"
echo "  send-daily-reminders (CRON_SECRET Bearer),"
echo "  demais: JWT + service role só no servidor."
