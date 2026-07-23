alter table public.orders
  add column buyer_note text,
  add column buyer_note_at timestamptz;

alter table public.orders
  add constraint orders_buyer_note_length
  check (buyer_note is null or char_length(buyer_note) between 1 and 180);

comment on column public.orders.buyer_note is
  'Optional one-time note submitted by the buyer after payment is confirmed.';
