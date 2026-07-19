-- Future-ideas §3: both scarcity axes become optional.
-- A null window_ends_at means the link never expires (permanent storefront);
-- a null stock_total means an uncapped product (nothing to race for, just pay).

alter table drops alter column window_ends_at drop not null;
alter table products alter column stock_total drop not null;

-- The guarded settlement update learns about uncapped products: with no cap
-- there is nothing to oversell, so the qty guard only applies when a cap exists.
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

  update public.products
  set stock_sold = stock_sold + v_order.qty
  where id = v_order.product_id
    and (stock_total is null or stock_sold + v_order.qty <= stock_total);

  get diagnostics v_rows_updated = row_count;

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
