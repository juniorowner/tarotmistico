-- Permite marcar pedidos reembolsados pelo Mercado Pago.

alter table public.credit_orders drop constraint if exists credit_orders_status_check;

alter table public.credit_orders
  add constraint credit_orders_status_check
  check (status in ('pending', 'paid', 'cancelled', 'failed', 'refunded'));

alter table public.credit_orders
  add column if not exists refunded_at timestamptz;

comment on column public.credit_orders.refunded_at is 'Quando o reembolso foi aplicado no app (webhook MP).';
