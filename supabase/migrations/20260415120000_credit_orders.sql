-- Pedidos de compra de créditos (Mercado Pago); créditos aplicados via webhook (service role)

create table if not exists public.credit_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package_id text not null,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'failed')),
  mp_preference_id text,
  mp_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists credit_orders_user_created_idx
  on public.credit_orders (user_id, created_at desc);

create index if not exists credit_orders_status_idx
  on public.credit_orders (status)
  where status = 'pending';

comment on table public.credit_orders is 'Checkout Mercado Pago; créditos só via Edge webhook';

alter table public.credit_orders enable row level security;

create policy "credit_orders_select_own"
  on public.credit_orders for select
  using (auth.uid() = user_id);

-- inserts apenas via service role (Edge Functions)
