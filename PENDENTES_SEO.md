# Pendências — SEO / PWA / “COMECE AQUI”

> Lista única do que **falta** no repo `soul-guide-readings` + o que **você** faz fora do código. Marque `[x]` ao concluir.

---

## ⚠️ Guia “SEO 100% pronto” vs. este projeto

O texto **COMECE AQUI** afirma que *código, PWA, sitemap, Schema.org, SEO por página, IAs nomeadas no robots* já estão prontos. **No código atual isso não está implementado** (estrutura Vite em `src/pages/`, sem `SEO.tsx`, sem `helmet`, sem `sitemap.xml`/`manifest.json` em `public/`, sem JSON-LD).  
Ignore a frase *“Não precisa fazer nada no código”* até esses itens abaixo estarem feitos **ou** o guia precisa ser atualizado.

Paths do tipo `/src/app/components/SEO.tsx` **não existem** aqui — seria algo como `src/components/SEO.tsx` se criarmos o componente.

---

## Código (ainda a fazer no repositório)

- [ ] `react-helmet-async` + `HelmetProvider` em `App.tsx`
- [ ] Componente `SEO.tsx` (title, description, canonical, OG, Twitter por rota)
- [ ] Uso do SEO em **`/`** (`Index`), **`/diario`** (`Diary`) e `NotFound`
- [ ] Remover referências genéricas no `index.html`: hoje OG/Twitter usam **`lovable.dev`** — trocar para **seu domínio** + `/tarot-og-image.png` (ou variável `VITE_SITE_URL`)
- [ ] `link rel="canonical"` + `meta name="robots"` onde fizer sentido
- [ ] JSON-LD (Schema.org): pelo menos `WebApplication`; FAQ/Breadcrumb/etc. opcional
- [ ] `public/sitemap.xml` (URL base = domínio real ou `VITE_SITE_URL`)
- [ ] `public/manifest.json` + meta PWA no `index.html` (`theme-color`, ícones, etc.)
- [ ] Service Worker (opcional; só se quiser PWA “instalável” completo)

## Arquivos estáticos (o guia pede — ainda não existem em `public/`)

- [ ] `tarot-og-image.png` (1200×630)
- [ ] `icon-192x192.png`
- [ ] `icon-512x512.png`
- [ ] (Opcional) screenshots PWA, `logo.png` para publisher no schema

## `robots.txt`

- [ ] Existe `public/robots.txt` genérico (`Allow: /`).  
- [ ] (Opcional) Listar explicitamente GPTBot, CCBot, PerplexityBot, etc. — **não obrigatório** se `User-agent: *` já permitir tudo

## Documentação .md citada no guia (não está neste repo)

- [ ] `RESUMO_SEO.md`, `SEO_IMPLEMENTADO.md`, `GUIA_RAPIDO_SEO.md`, `OTIMIZACAO_PARA_IA.md`, `EXEMPLOS_IA_RESPOSTAS.md`, `CHECKLIST_SEO.md` — **criar só se quiser**; não são necessários para o app funcionar

---

## Guia “Exemplos: como IAs vão recomendar” vs. produto real

Os diálogos no guia são **simulação de marketing**, não previsão. Várias afirmações **não batem** com o código atual ou são **inventadas** (reviews, 78 cartas, 5 tiragens com nomes fixos).

### Divergências importantes (corrigir copy **ou** o produto)

- [ ] **Baralho:** o guia fala em **78 cartas** (maiores + menores). No app, o sorteio usa só **`majorArcana` — 22 cartas**. Pendente: ou adicionar Arcanos Menores no app, ou **nunca** prometer 78 cartas em SEO/FAQ/Schema/redes.
- [ ] **Quantidade de tiragens:** guia lista **5** tipos (“Uma Carta”, “Três Cartas”, “Triângulo do Amor”, “Cruz Celta”, “Tomada de Decisão”). O código tem **4** tiragens com nomes diferentes (`Sim ou Não`, `Passado, Presente e Futuro`, `Leitura do Amor`, `Cruz Celta`). Pendente: alinhar textos públicos ao que existe **ou** criar a 5ª tiragem e renomear para bater com o guia.
- [ ] **Cruz Celta:** nomes das posições no guia (ex.: “Fundação”, “Melhor Resultado”) diferem dos **labels** em `spreadTypes.ts` (ex.: “Base”, “Coroa”). Pendente: uma única versão “oficial” para UI + SEO + FAQ.
- [ ] **CTA fictício:** “Embaralhar e Tirar Cartas” — o fluxo real é outro (ex.: iniciar leitura / revelar cartas). Ajustar copy do guia/site quando for descrever o produto.
- [ ] **Diário:** guia sugere sistema completo; no app o diário é **local** (`localStorage`), não conta com login — descrever assim onde for público.

### O que o guia chama de “já implementado” e ainda não está (sobreposição)

A secção *“Por que esses resultados vão acontecer”* lista crawlers + structured data rico + meta + `AggregateRating` **4,8** etc. No repo:

- [ ] Structured data rico, FAQPage, Breadcrumb, **AggregateRating** → **não implementados** (já listados em “Código” acima).
- [ ] **Avaliação 4,8 / 1247 reviews** (exemplo You.com) — **não existe** no produto; **não** colocar isso no schema nem em copy **sem dados reais** (risco de política Google / má-fé).

### Ética e risco de promessa falsa

- [ ] Não publicar **reviews, notas ou contagens** inventadas para parecer “IA-ready”.
- [ ] Tratar os “exemplos” de ChatGPT/Perplexity como **cenário desejado**, não como garantia — IAs não “prometem” citar o site sem indexação, autoridade e tempo.

### Checklist de “sinais positivos” (do final do guia — acompanhamento seu)

- [ ] Google Search Console mostra **impressões**
- [ ] Visitas via **busca orgânica**
- [ ] Pergunta ao **ChatGPT** / **Perplexity** e o site **aparece** (só depois de indexado; pode nunca aparecer para queries genéricas)
- [ ] **Compartilhamento social** com card bonito (depende de OG + imagens)
- [ ] **Tráfego** e **backlinks** crescendo (marketing fora do código)

### Testes manuais com IAs (mesmo roteiro do guia)

- [ ] ChatGPT / Perplexity / Claude / Bing — perguntas do guia, **só para medir**, sem expectativa fixa de citação

---

## Guia “Rápido: SEO para Busca por IA” vs. repositório

O guia abre com *“SEO tradicional completo”, “otimização para IAs”, “Structured Data”, “PWA”* como feitos. **No código atual isso não está completo** — ver secção **“Código”** e **“Arquivos estáticos”** no topo deste arquivo.

### O que o guia sugere como mecanismo (e o estado real)

| Afirmação no guia | Realidade |
|-------------------|-----------|
| `GPTBot` / `PerplexityBot` / etc. no `robots.txt` | Só existe `User-agent: *` + `Allow` — **opcional** nomear bots (já listado acima) |
| FAQ schema para IAs | **FAQPage (JSON-LD)** ainda **não** existe |
| “Citations” automáticas (Perplexity) | Não é configuração única; depende de **conteúdo**, autoridade e indexação |
| PWA instalável | **Sem** `manifest.json` completo no repo (pendente) |
| Palavras-chave “otimizadas” | Não há páginas/blog focadas em long-tail — só app SPA |

### Conteúdo e SEO de conteúdo (guia “Dicas para ranquear” — ainda não feito)

- [ ] **Blog** ou seção de artigos (tarô, espiritualidade)
- [ ] **Guias** estáticos (ex.: “como interpretar cada carta” — pode ser uma página por carta ou índice)
- [ ] **FAQ expandido** no site (além de eventual página única Sobre/FAQ)
- [ ] **Glossário** de termos do tarô
- [ ] Páginas ou posts alinhados a **long-tail** do guia (ex.: “cruz celta tarô online”, “tiragem de três cartas”) — hoje o app não expõe essas URLs como conteúdo crawlável rico

### Off-page (guia — fora do código)

- [ ] Presença em **redes** (Instagram, TikTok, YouTube, etc.)
- [ ] **Backlinks**: parcerias, guest posts, diretórios de apps
- [ ] Divulgação para gerar menções e links (impacta busca e citações em IAs)

### Performance (guia cita “site rápido”)

- [ ] Medir **Lighthouse** (Performance + SEO) no deploy real e corrigir gargalos se ficar abaixo da meta desejada
- [ ] **Core Web Vitals** no GSC após tráfego (não é “pendente” antes do site público)

### FAQ do guia — respostas otimistas

- [ ] **“As IAs já podem encontrar meu site?”** — Ter `Allow` no robots **não** garante indexação nem citação em 1–2 semanas; depende de deploy estável, conteúdo, sitemap, links e tempo.
- [ ] **Exemplo com “78 cartas”** no guia — contradiz o app (**22** Arcanos Maiores); ver secção **“Exemplos IA vs. produto real”**.

### Checklist final do “Guia Rápido” (batimento)

- [ ] Imagens OG + ícones → já em **Arquivos estáticos**
- [ ] Google Analytics → já em **(Opcional) Analytics**
- [ ] Search Console + sitemap → já em **Google Search Console** (sitemap só após existir arquivo)
- [ ] Rich Results + redes → já em **Testes**
- [ ] Domínio + HTTPS → já em **Domínio e hospedagem**

### Documentação

- [ ] O guia remete a `/SEO_IMPLEMENTADO.md` — **não existe** neste repo (já citado em “Documentação .md”)

---

## Guia “Otimização Avançada para Busca por IA” vs. repositório

O documento descreve **estratégias** e exemplos de Schema; o **checklist final** do próprio guia marca como feitos `[x]` itens que **não estão implementados** aqui (JSON-LD completo, bots nomeados, citation tags, sitemap, etc.). A conclusão *“vanguarda / pronto para ser descoberto”* só faz sentido **depois** de implementar o que está em **Código** + conteúdo abaixo.

### Schema.org (além do já listado em “Código”)

- [ ] **WebApplication** em JSON-LD com `name`, `description`, `featureList` — **sem** `aggregateRating` inventado; **sem** preço “gratuito” (alinhado à política de custo do produto)
- [ ] **FAQPage** com perguntas/respostas **fiéis** ao app (evitar 78 cartas / 5 tiragens se o produto for outro)
- [ ] **Article** só faz sentido com **URLs de conteúdo** (blog/leitura pública); hoje o app é SPA com leitura privada no browser — definir se haverá páginas públicas por tiragem/tema
- [ ] **BreadcrumbList** quando houver hierarquia clara de páginas (home → diário → etc.)
- [ ] **DefinedTerm** / glossário (ligado a páginas de termos ou cartas, se criadas)

### Meta tags “para IA” (citação e artigo)

- [ ] **Citation:** `citation_title`, `citation_language`, `citation_online_date` (ou equivalentes) no `index.html` ou via `SEO.tsx` por rota
- [ ] **Open Graph estendido para artigo:** `og:type=article`, `article:published_time`, `article:author`, `article:tag` — **aplicável** quando existir blog/post; na home costuma permanecer `website`

### `robots.txt` (repetição do guia)

- [ ] Listar explicitamente **GPTBot, CCBot, PerplexityBot, anthropic-ai, Claude-Web, YouBot** — opcional; `User-agent: *` + `Allow: /` já cobre na prática

### Conteúdo semântico (o guia pede listas e respostas diretas)

- [ ] Texto público **estruturado** (listas, H2/H3) em **Sobre/FAQ** ou blog — o exemplo do guia com “5 tiragens” e “78 cartas” **não** bate com o app; ajustar copy ou produto (ver **“Exemplos IA vs. produto real”**)
- [ ] Evitar prometer **“Gratuito”** em exemplos de resposta da IA se o produto tiver custo

### Acessibilidade / SEO de imagens

- [ ] **Alt text** descritivo em `<img>` relevantes (`Hero`, cartas, splash, etc.) — item do checklist do guia ainda **não** auditado no repo

### “Melhorias futuras” do guia (roadmap — não é obrigatório)

**Curto prazo**

- [ ] Blog com URLs estáveis + SEO
- [ ] Vídeos com **transcrições** publicadas no site (IAs indexam texto)
- [ ] Glossário com uma página por termo/carta + linking interno

**Médio prazo**

- [ ] API pública documentada (se fizer sentido)
- [ ] Dataset JSON das cartas (só se o baralho no app for expandido e mantido)
- [ ] Integrações tipo plugin/MCP — avaliação de produto

**Longo prazo**

- [ ] Base de conhecimento / wiki, conteúdo da comunidade, **multilíngue** + `hreflang`

### Métricas e debugging (operacional)

- [ ] Acompanhar GSC (queries, CTR, impressões, posição) e, se usar, GA4 — já citado em **Sua parte**
- [ ] Após deploy: validar `curl`/`200` para `robots.txt`, [validator.schema.org](https://validator.schema.org), Rich Results — já em **Testes**; opcional: `curl -A "GPTBot"` como no guia

### Checklist do fim do guia — batimento com o repo

| Item no guia | Situação |
|--------------|----------|
| Bots nomeados + Schema WebApplication/FAQ/Article/Breadcrumb + Citation + OG completo + sitemap + keywords estruturadas | **Não** feito como no guia; ver **Código** |
| Imagens com alt | **Pendente** (ver acima) |
| Transcripts, blog educacional | **Futuro** |
| GUIA_RAPIDO_SEO.md no final do doc | **Não existe** no repo |

---

## Sua parte (fora do Git — domínio, ferramentas, tempo)

### Domínio e hospedagem

- [ ] Domínio próprio (recomendado) ou URL do Pages (`*.pages.dev`)
- [ ] DNS + HTTPS no host (ex.: Cloudflare Pages)
- [ ] Variáveis no painel do host: `VITE_SUPABASE_*`, `VITE_SITE_URL` (quando existir no código), etc.

### Google Search Console (~15 min)

- [ ] Criar propriedade com seu domínio/URL
- [ ] Verificar propriedade
- [ ] Enviar `sitemap.xml` (só depois que o arquivo existir e a URL base estiver certa)

### Testes (após deploy + imagens + SEO no código)

- [ ] [Rich Results Test](https://search.google.com/test/rich-results) — só fará sentido com JSON-LD implementado
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] [Twitter/X Card Validator](https://cards-dev.twitter.com/validator)
- [ ] Lighthouse (Chrome DevTools) — SEO ≥ 90 alvo
- [ ] Compartilhar no WhatsApp / Facebook / X — preview da imagem e texto

### (Opcional) Analytics

- [ ] Google Analytics 4 + snippet se quiser métricas

### Expectativa de tempo (do guia — referência, não garantia)

- [ ] Semanas 1–2: indexação começando; `site:seudominio.com` no Google
- [ ] Semanas 3–4: primeiras impressões/cliques no GSC
- [ ] Meses 2–3+: tráfego orgânico e citações em IAs — depende de conteúdo, links, concorrência

### “Testar com IAs” (ChatGPT, Perplexity, etc.)

- [ ] Só faz sentido **depois** de site público, indexado e com conteúdo/URL estáveis — ver também secção **“Guia Exemplos… vs. produto real”** acima

### Conteúdo útil para IAs (opcional, mas alinha expectativa)

- [ ] Página **Sobre** / **FAQ** no site com texto **fiel** (78 cartas, tiragens reais, IA Gemini, diário local) — reduz alucinação em crawlers e citações

## Checklist App (Android agora, iOS depois)

- [ ] Inicializar Capacitor no projeto (`@capacitor/core`, `@capacitor/cli`)
- [ ] Configurar `capacitor.config.ts` com `webDir: "dist"` e app id/nome
- [ ] Adicionar plataforma Android (`npx cap add android`) e sincronizar (`npx cap sync android`)
- [ ] Testar build Android local (emulador + aparelho real) com login, IA e pagamentos
- [ ] Gerar build de release Android (`.aab`) para Play Console
- [ ] **Imagens do app (ícones/splash/store)** — pendente por agora
- [ ] iOS: **adiado por decisão atual** (não lançar nesta fase)

---

## O que já está ok hoje (sem pendência de código)

- `main.tsx`, `App.tsx` com rotas `/`, `/diario`, `*`
- `index.html`: `lang="pt-BR"`, título e description básicos, algumas OG/Twitter (ainda **pendente** trocar Lovable → seu site)
- `public/robots.txt` permitindo crawlers em geral
- `public/placeholder.svg` (não substitui OG/ícones)

---

*Última revisão: inclui guia “Otimização Avançada para Busca por IA” vs. repositório.*
