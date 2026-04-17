alter table public.credit_orders
  add column if not exists credits_applied boolean not null default false;

create index if not exists credit_orders_paid_unapplied_idx
  on public.credit_orders (user_id, created_at desc)
  where status = 'paid' and credits_applied = false;
