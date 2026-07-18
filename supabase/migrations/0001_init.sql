-- Drops — initial schema (tech spec §3)
-- Applied via Supabase Management API. Source of truth lives here.

create table if not exists drops (
  id            uuid primary key default gen_random_uuid(),
  seller_name   text not null,
  seller_slug   text not null,          -- drops.sg/{seller_slug}/{drop_slug}
  drop_slug     text not null,
  manage_token  text not null unique,   -- 32-byte random; the only "auth"
  fulfilment    text not null check (fulfilment in ('pickup','delivery','both')),
  delivery_fee  numeric(10,2) not null default 0,
  pickup_note   text,
  window_ends_at timestamptz not null, -- SGT in UI
  status        text not null default 'live' check (status in ('live','ended')),
  created_at    timestamptz not null default now(),
  unique (seller_slug, drop_slug)
);

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  drop_id     uuid not null references drops,
  name        text not null,
  variant     text,
  price       numeric(10,2) not null,
  stock_total int not null,
  stock_sold  int not null default 0    -- ONLY the webhook txn writes this
);

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),  -- = HitPay reference_number
  product_id    uuid not null references products,
  qty           int not null check (qty > 0),
  buyer_name    text not null,
  buyer_contact text not null,          -- phone; free text
  fulfilment    text not null,          -- 'pickup' | 'delivery'
  address       text,
  amount        numeric(10,2) not null, -- price*qty + delivery_fee, computed server-side
  status        text not null default 'PENDING'
                check (status in ('PENDING','PAID','PAID_LATE')),
  hitpay_payment_request_id text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists webhook_events (
  event_id     text primary key,        -- payload id → idempotency
  payload      jsonb not null,
  received_at  timestamptz not null default now()
);

-- RLS: enabled everywhere.
alter table drops enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table webhook_events enable row level security;

-- Anon may read drops/products only (Realtime + buyer page).
-- orders and webhook_events get no policies → server-only (service role bypasses RLS).
drop policy if exists "anon read drops" on drops;
create policy "anon read drops" on drops for select to anon using (true);

drop policy if exists "anon read products" on products;
create policy "anon read products" on products for select to anon using (true);

-- Realtime fan-out: clients subscribe to postgres_changes UPDATE on products.
alter publication supabase_realtime add table products;
