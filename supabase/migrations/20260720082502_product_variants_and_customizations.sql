-- One storefront listing can now have independently stocked variants (sizes)
-- and shared-stock buyer customizations (chilli / no chilli). Existing
-- listings are backfilled with one hidden default variant so every checkout
-- follows the same inventory path.

alter table public.products
  add column if not exists customization_groups jsonb not null default '[]'::jsonb,
  add column if not exists inventory_choice_name text;

alter table public.products
  add constraint products_customization_groups_array
  check (jsonb_typeof(customization_groups) = 'array');

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text,
  price numeric(10,2) not null check (price > 0),
  stock_total int check (stock_total is null or stock_total >= 0),
  stock_sold int not null default 0 check (stock_sold >= 0),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique nulls not distinct (product_id, label)
);

create index product_variants_product_id_position_idx
  on public.product_variants(product_id, position);

insert into public.product_variants (
  product_id,
  label,
  price,
  stock_total,
  stock_sold,
  position
)
select id, null, price, stock_total, stock_sold, 0
from public.products;

alter table public.orders
  add column if not exists product_variant_id uuid references public.product_variants(id),
  add column if not exists selected_customizations jsonb not null default '{}'::jsonb;

update public.orders as orders
set product_variant_id = variants.id
from public.product_variants as variants
where variants.product_id = orders.product_id
  and variants.label is null
  and orders.product_variant_id is null;

alter table public.orders
  alter column product_variant_id set not null,
  add constraint orders_selected_customizations_object
  check (jsonb_typeof(selected_customizations) = 'object');

alter table public.product_variants enable row level security;

create policy "anon read product variants"
on public.product_variants
for select
to anon
using (true);

grant select on table public.product_variants to anon;
grant select, insert, update, delete on table public.product_variants to service_role;
grant update, delete on table public.products to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_variants'
  ) then
    alter publication supabase_realtime add table public.product_variants;
  end if;
end;
$$;

-- Settle the exact inventory unit selected at checkout, then update the
-- listing aggregate used by storefront scarcity and seller reporting.
create or replace function public.process_hitpay_payment(
  p_event_id text,
  p_payload jsonb,
  p_reference_number uuid,
  p_payment_request_id text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_rows_updated integer;
begin
  insert into public.webhook_events (event_id, payload)
  values (p_event_id, p_payload)
  on conflict (event_id) do nothing;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    return 'duplicate';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_reference_number
  for update;

  if not found then
    return 'order_not_found';
  end if;

  if v_order.status <> 'PENDING' then
    return 'already_processed';
  end if;

  if v_order.hitpay_payment_request_id is distinct from p_payment_request_id then
    return 'payment_request_mismatch';
  end if;

  update public.product_variants
  set stock_sold = stock_sold + v_order.qty
  where id = v_order.product_variant_id
    and product_id = v_order.product_id
    and (stock_total is null or stock_sold + v_order.qty <= stock_total);

  get diagnostics v_rows_updated = row_count;

  if v_rows_updated = 1 then
    update public.products
    set stock_sold = stock_sold + v_order.qty
    where id = v_order.product_id;
  end if;

  update public.orders
  set
    status = case when v_rows_updated = 1 then 'PAID' else 'PAID_LATE' end,
    paid_at = now()
  where id = v_order.id;

  if v_rows_updated = 1 then
    return 'paid';
  end if;

  return 'paid_late';
end;
$$;
