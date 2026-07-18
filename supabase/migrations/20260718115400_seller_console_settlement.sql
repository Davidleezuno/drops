-- Ticket 05: the manage token is the only seller credential. Keep it out of
-- every public Data API response while preserving the storefront's public drop
-- fields. RLS is row-level, so this needs an explicit column privilege boundary.

revoke select on table public.drops from anon, authenticated;
grant select (
  id,
  seller_name,
  seller_slug,
  drop_slug,
  fulfilment,
  delivery_fee,
  pickup_note,
  window_ends_at,
  status,
  created_at
) on table public.drops to anon;

-- The token-gated server console can explicitly end a live drop. The
-- service/secret key remains server-only and checks the token before updating.

grant update on table public.drops to service_role;
