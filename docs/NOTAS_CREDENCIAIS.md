# Credenciais, ambientes e repositório

Referência permanente: **o que precisa de segredo**, **onde configurar**, e **qual é o remoto Git oficial**.  
**Nunca** colar chaves reais neste ficheiro nem commitar `.env` com segredos.

---

## Repositório Git (código)

| Item | Valor / nota |
|------|----------------|
| **Remoto indicado** | `https://github.com/juniorowner/tarotmistico.git` |
| **Visibilidade** | Definir **Private** em GitHub → *Settings* → *Danger zone* → *Change repository visibility*. |
| **Quem autentica o `git push`** | A tua máquina: **SSH** (chave `~/.ssh/id_ed25519` + agente) ou **HTTPS** com **Personal Access Token (PAT)** do GitHub (scopes: `repo`). |

O Cursor/IDE não substitui o teu login no GitHub: o push só funciona se **tu** já tiveres credenciais configuradas.

---

## Front-end (Vite / Cloudflare Pages / build local)

Variáveis **`VITE_*`** são embutidas no bundle em **build time**. Configurar no **Cloudflare Pages → Settings → Environment variables** (e no `.env` local, **fora do Git**).

| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (`https://xxx.supabase.co`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave **anon** (pública); vai no cliente — ok para front, desde que **RLS** esteja bem fechado. |
| `VITE_SUPABASE_PROJECT_ID` | ID/ref do projeto (se o código ou scripts o usarem). |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Chave **pública** MP (checkout no browser). |
| `VITE_SITE_URL` | URL canónica do site (SEO / links), ex. `https://www.teudominio.com`. |
| `VITE_WEB_PUSH_PUBLIC_KEY` | Chave **pública** VAPID para notificações push no browser. |

**Não** pôr no front: `service_role`, tokens MP de servidor, `GEMINI_API_KEY`, etc.

### Cloudflare Pages — build (npm, não Bun)

Se no log aparecer `bun install --frozen-lockfile` e falhar: o Pages deteta `bun.lock` / `bun.lockb` e tenta Bun. **Este repo usa só `package-lock.json`.** Não commitar `bun.lock` nem `bun.lockb` (estão no `.gitignore`).

| Campo no Pages | Valor |
|-----------------|--------|
| **Build command** | `npm run build` (ou `npm ci && npm run build` para instalação estrita a partir do lock npm) |
| **Build output directory** | `dist` |
| **Root directory** | vazio, se o `package.json` estiver na raiz do repo |

Variáveis `VITE_*` em **Settings → Environment variables** (Production).

---

## Supabase — Auth (dashboard)

| Onde | O quê |
|------|--------|
| **Authentication → URL configuration** | **Site URL** = URL real do site em produção. |
| **Redirect URLs** | Lista de URLs permitidas para login/callback (produção + `http://localhost:…` para dev). |

Sem isto, login e redirects falham após mudar de domínio.

---

## Supabase — Edge Functions (secrets no dashboard)

Definir em **Project Settings → Edge Functions → Secrets** (ou CLI `supabase secrets set`). Estas **não** são `VITE_`.

| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | URL do projeto (muitas vezes injectada automaticamente; confirmar na doc do host). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privilégio total** — só servidor/functions; **nunca** no front. |
| `AI_API_KEY` ou `GEMINI_API_KEY` | IA (interpretação); opcionais: `AI_PROVIDER`, `GEMINI_MODEL`, `GEMINI_MAX_OUTPUT_TOKENS`. |
| `MERCADOPAGO_ACCESS_TOKEN` | Token **servidor** Mercado Pago (preferências, pagamentos, webhook). |
| `MERCADOPAGO_WEBHOOK_SECRET` | Validação do corpo do webhook MP. |
| `SITE_URL` | URL pública do site (ex.: `back_urls` / notificações MP). |
| `CRON_SECRET` | Proteger invocação agendada (ex.: lembretes diários). |
| `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` / `WEB_PUSH_SUBJECT` | Push no servidor (função de lembretes). |

---

## Mercado Pago (conta de desenvolvedor)

- **Chave pública** → front (`VITE_MERCADOPAGO_PUBLIC_KEY`).
- **Access token** (produção ou teste) → apenas secrets das Edge Functions.
- **Webhook** no painel MP → URL da função `mercadopago-webhook` no Supabase + o mesmo segredo que `MERCADOPAGO_WEBHOOK_SECRET`.

---

## Ficheiro `.env` local

- Copiar de `.env.example`, preencher valores reais em **`.env`**.
- Garantir que **`.env` não está versionado** (`git rm --cached .env` se já tiver entrado no histórico por engano).
- Rodar chaves no Supabase/MP se alguma vez tiver ido parar ao Git por erro.

---

## Checklist rápido “o que precisa de credencial”

1. **Git push** → conta GitHub + SSH ou PAT.  
2. **Site em produção** → `VITE_*` no Cloudflare (ou outro host).  
3. **Supabase client** → `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.  
4. **Edge Functions** → `SUPABASE_SERVICE_ROLE_KEY` + secrets de IA/MP/cron/push conforme funções deployadas.  
5. **Login no domínio** → URLs no Supabase Auth.  
6. **Pagamentos** → MP (pública + token + webhook).  

---

*Última referência de remoto: `https://github.com/juniorowner/tarotmistico.git` — ao mudar de repo, actualizar este documento.*
