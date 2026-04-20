# GA4 — Ordem de Eventos para Sucesso

Atualizado: 2026-04-20
Projeto: soul-guide-readings

Este documento organiza os eventos do Google Analytics na ordem ideal do funil para medir sucesso de conversao (da visita ate leitura, pagamento e retencao).

## 1) Descoberta e entrada no funil

Ordem esperada:

1. `conversion_hero_cta`
2. `conversion_spread_auto_suggested` (quando houver sugestao automatica)
3. `conversion_spread_selected`
4. `conversion_choose_continue`
5. `conversion_preview_to_reading`

Alternativa de fuga:

- `conversion_skip_to_catalog`

Sinal de sucesso nesta etapa:

- Alta taxa de quem sai de `conversion_hero_cta` para `conversion_preview_to_reading`.

## 2) Inicio de leitura (engajamento)

Ordem esperada:

1. `reading_started`
2. `reading_all_cards_revealed`

Sinal de sucesso nesta etapa:

- Alta taxa de conclusao entre `reading_started` e `reading_all_cards_revealed`.

## 3) Pedido de interpretacao IA (intencao forte)

Ordem esperada:

1. `ai_interpretation_requested`

Possiveis bifurcacoes:

- Guest com sucesso:
  - `guest_interpretation_success`
  - `guest_first_reading_completed`
- Logado com sucesso:
  - `consultation_committed`
  - `ai_interpretation_success`
- Bloqueios esperados:
  - `ai_interpretation_auth_required`
  - `consultation_commit_quota_exceeded`
  - `ai_interpretation_quota_exceeded`
  - `guest_interpretation_blocked_already_used`

Sinal de sucesso nesta etapa:

- Queda de `*_quota_exceeded` e `*_failed`.
- Crescimento de `ai_interpretation_success` e `guest_interpretation_success`.

## 4) Autenticacao (quando exigida)

Ordem esperada:

1. `auth_mode_selected`
2. `auth_email_submit` ou `auth_google_submit`
3. `auth_email_success` ou `auth_signed_in`

Eventos de monitoramento:

- `auth_email_failed`
- `auth_google_failed`
- `auth_signup_pending_confirmation`
- `password_reset_requested`
- `password_reset_email_failed`
- `password_reset_failed`
- `password_reset_completed`

Sinal de sucesso nesta etapa:

- Aumento de `auth_email_success` e reducao de `auth_email_failed`.

## 5) Monetizacao (creditos e Pix)

Ordem esperada:

1. `creditos_page_view`
2. `pix_payment_requested`
3. `pix_qr_generated`
4. `pix_code_copied` (opcional, mas bom sinal)
5. `pix_payment_approved` ou `pix_payment_approved_polling` ou `pix_payment_approved_order_fallback`

Eventos de alerta:

- `credits_buy_auth_required`
- `pix_payment_failed`

Sinal de sucesso nesta etapa:

- Aumento da taxa `pix_payment_requested -> pix_payment_approved*`.

## 6) Qualidade operacional (erros e friccao)

Monitorar com atencao:

- `consultation_commit_failed`
- `ai_interpretation_failed`
- `guest_interpretation_failed`
- `consultation_commit_quota_exceeded`
- `ai_interpretation_quota_exceeded`

Sinal de sucesso nesta etapa:

- Reducao continua desses eventos por release.

## 7) Sequencia principal de "sucesso completo" (usuario pago)

Fluxo ideal de ponta a ponta:

1. `conversion_hero_cta`
2. `conversion_spread_selected`
3. `conversion_choose_continue`
4. `conversion_preview_to_reading`
5. `reading_started`
6. `reading_all_cards_revealed`
7. `ai_interpretation_requested`
8. `consultation_committed`
9. `ai_interpretation_quota_exceeded` (caso sem saldo, opcional)
10. `creditos_page_view`
11. `pix_payment_requested`
12. `pix_qr_generated`
13. `pix_payment_approved*` (qualquer variante de aprovado)
14. `ai_interpretation_requested` (nova tentativa apos credito)
15. `consultation_committed`
16. `ai_interpretation_success`

## 8) KPIs recomendados (derivados desses eventos)

1. Conversao de entrada:
   - `conversion_preview_to_reading / conversion_hero_cta`
2. Conclusao de leitura:
   - `reading_all_cards_revealed / reading_started`
3. Conversao para interpretacao:
   - `ai_interpretation_requested / reading_all_cards_revealed`
4. Conversao de pagamento:
   - `pix_payment_approved* / pix_payment_requested`
5. Conversao final de valor:
   - `ai_interpretation_success / ai_interpretation_requested`
6. Taxa de erro operacional:
   - `(consultation_commit_failed + ai_interpretation_failed + guest_interpretation_failed) / ai_interpretation_requested`

