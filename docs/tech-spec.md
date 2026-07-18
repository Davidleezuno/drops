# Drops — Tech Spec

Companion to [spec.md](spec.md). Decisions locked 18 Jul: single Next.js codebase on Vercel (webhook included), Supabase as Postgres + Realtime only, no seller auth (secret console URL), one product × qty per order, hosted HitPay checkout.

---

## 1. Stack

- **Next.js (App Router) on Vercel** — all pages and all server logic, including the webhook route. One codebase, one deploy.
- **Supabase** — Postgres (data + the one guarded stock write) and Realtime (counter fan-out to phones/projector). No Edge Functions, no Supabase Auth.
- **Vercel AI Gateway via AI SDK** (`ai` v6; a plain `"provider/model"` string routes through the gateway automatically) — menu-image extraction only, structured output via zod. Model is config, not code: `EXTRACT_MODEL` env var, default `anthropic/claude-sonnet-5`, swappable to any gateway slug (e.g. `openai/gpt-5.4`, `google/gemini-3-flash`) without a code change. Gateway gives cost tracking and failover for free. AI never touches money or stock.
- **HitPay sandbox** — payment requests + dashboard-registered webhook.

## 2. Repo layout

```
app/
  page.tsx                     landing → "Create a drop"
  new/page.tsx                 upload photo → review form → publish
  [seller]/[drop]/page.tsx     buyer drop page (realtime counter)
  order/[id]/page.tsx          post-checkout status ("Paid ✓ / checking…")
  manage/[token]/page.tsx      seller console (realtime feed, packing list)
  api/extract/route.ts         image → products JSON (Claude)
  api/drops/route.ts           create drop (validated review-form payload)
  api/buy/route.ts             order row + HitPay payment request → checkout URL
  api/hitpay/webhook/route.ts  THE stock writer
lib/
  db.ts                        Supabase server client (service role)
  hitpay.ts                    createPaymentRequest, getPaymentStatus
  verify.ts                    HMAC validation
```

## 3. Data model

```sql
create table drops (
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

create table products (
  id          uuid primary key default gen_random_uuid(),
  drop_id     uuid not null references drops,
  name        text not null,
  variant     text,
  price       numeric(10,2) not null,
  stock_total int not null,
  stock_sold  int not null default 0    -- ONLY the webhook txn writes this
);

create table orders (
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

create table webhook_events (
  event_id     text primary key,        -- payload id → idempotency
  payload      jsonb not null,
  received_at  timestamptz not null default now()
);
```

**RLS:** enabled everywhere. Anon key gets `select` on `drops` and `products` only (needed for Realtime + buyer page). `orders` and `webhook_events` are server-only (PII) — console and status pages read through server components using the service role, gated by `manage_token` / order `id` in the URL.

**Realtime:** clients subscribe to `postgres_changes` `UPDATE` on `products` filtered by `drop_id`, and render `stock_total − stock_sold`. One channel per drop page; the projector is just another subscriber.

## 4. Core flows

### 4a. Create a drop (`/new`)

1. Seller uploads photo → `POST /api/extract` → `generateObject({ model: process.env.EXTRACT_MODEL, ... })` through AI Gateway, zod schema `{ products: [{ name, variant?, price }] }`. Single call, ~3 s. Optional resilience, one line: `providerOptions: { gateway: { models: ['openai/gpt-5.4'] } }` as fallback model if the primary errors on the night.
2. **One review form, not a chat.** Extracted rows are editable inline; the three blocking fields sit below: stock per item, window end, fulfilment (pickup / delivery + fee). This *is* the "max 3 questions".
3. `POST /api/drops` → insert drop + products, generate `manage_token`, derive slugs (kebab-case seller name + short word, editable) → respond with both URLs. UI shows buyer link big + QR, console link with a "keep this secret" note.

### 4b. Buy (`POST /api/buy`)

```
body: { product_id, qty, buyer_name, buyer_contact, fulfilment, address? }

1. Load product + drop; reject if drop ended or stock_total − stock_sold < qty
   (soft guard — UX only, not the source of truth)
2. amount = price*qty + (fulfilment=='delivery' ? delivery_fee : 0)
3. INSERT order (PENDING)
4. POST https://api.sandbox.hit-pay.com/v1/payment-requests
     headers: X-BUSINESS-API-KEY, Content-Type: application/x-www-form-urlencoded
     body: amount, currency=SGD, payment_methods[]=paynow_online&payment_methods[]=card,
           reference_number={order.id}, purpose="{drop} — {product} ×{qty}",
           name={buyer_name}, redirect_url={APP_URL}/order/{order.id}
5. Save hitpay_payment_request_id; return checkout url → client redirects
```

Buyer pays on HitPay's hosted page. Abandoned checkouts leave harmless PENDING rows — no money moved, no stock held, no cleanup needed.

### 4c. Webhook (`POST /api/hitpay/webhook`) — the only stock writer

```ts
const raw = await req.text();                      // raw body BEFORE parsing
const sig = req.headers.get('hitpay-signature');
if (hmacSHA256(raw, HITPAY_WEBHOOK_SALT) !== sig) return 401;

const evt = JSON.parse(raw);
// idempotency: first writer wins
insert into webhook_events (event_id, payload) on conflict do nothing;
if (conflict) return 200;

if (status !== 'completed') return 200;
const order = lookup by reference_number;          // PENDING expected
```

Then one transaction:

```sql
update products set stock_sold = stock_sold + :qty
 where id = :product_id and stock_sold + :qty <= stock_total;
-- 1 row → update orders set status='PAID',      paid_at=now()
-- 0 rows → update orders set status='PAID_LATE', paid_at=now()
```

The guarded `UPDATE` is the entire concurrency story: the last unit resolves to exactly one `PAID` regardless of how many checkouts race. `PAID_LATE` means real money after sellout — flagged in the console for refund, never dropped. The `products` update fires Realtime to every phone. Always return 200 fast; all work above is < 50 ms.

**Day-1 verification (do not skip):** HitPay has two webhook styles (per-webhook salt / `Hitpay-Signature` header over raw body vs. legacy API-key salt / `hmac` field over sorted params). Register the dashboard webhook for `payment_request.completed`, fire one sandbox payment (or HitPay CLI `listen`/`trigger`), and confirm the header name, salt, and the JSON path to `reference_number` and `status` against a real payload before building on it.

### 4d. Order status (`/order/[id]`)

Server component reads the order. `PENDING` → "Confirming payment…" with client-side refetch every 2 s, and after ~10 s a server-side fallback call to `GET /v1/payment-requests/{id}` (docs-sanctioned) that funnels through the same guarded transaction as the webhook. Never trust the redirect itself — the page only reflects DB state.

### 4e. Seller console (`/manage/[token]`)

Server-gated by token. Live order feed (Realtime on `products` + refetch of orders), stock remaining, countdown. `PAID_LATE` pinned top in red with "refund in HitPay dashboard" note. When `window_ends_at` passes or everything sells out: **packing list** (`sum(qty) group by product`) and **delivery list** (paid orders with contact + address), both with copy buttons. "End drop now" button sets `status='ended'`.

Drop end is evaluated on read (`window_ends_at < now() or status='ended'`) — no cron anywhere.

## 5. Config

```
HITPAY_API_KEY                sandbox dashboard → Developers → API Keys
HITPAY_WEBHOOK_SALT           dashboard → Developers → Webhooks → (endpoint) → salt
EXTRACT_MODEL                 gateway slug, default anthropic/claude-sonnet-5
VERCEL_OIDC_TOKEN             AI Gateway auth — auto on Vercel; locally via `vercel env pull`
                              (or set AI_GATEWAY_API_KEY for a static key; no ANTHROPIC_API_KEY)
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL           the Vercel prod URL (redirect_url base)
```

AI Gateway setup: enable AI Gateway in the Vercel project settings, then `vercel link && vercel env pull .env.local` — that provisions `VERCEL_OIDC_TOKEN` locally (~24 h, re-pull when it expires); deployed functions get it automatically. Model changes are an env-var edit, no redeploy of code paths.

Sandbox setup: create account at dashboard.sandbox.hit-pay.com → enable PayNow, cards, GrabPay in Settings → Payment Methods → register webhook at `{APP_URL}/api/hitpay/webhook`. Webhook needs the deployed URL, so deploy a skeleton to Vercel *first*, then wire sandbox. Local iteration on the webhook: HitPay CLI `listen`/`trigger`. Rate limit 70 payment creations/min ≫ room size.

Build with the HitPay Claude Code plugin / AI skills and record it — demo requirement + scoring bonus.

## 6. Failure modes on the night

| Risk | Mitigation |
|---|---|
| Webhook delayed/undelivered | `/order/[id]` fallback poll to `GET /v1/payment-requests/{id}` → same guarded txn |
| Venue wifi flaky on phones | Everything is deployed (no localhost); QR points at prod URL; 4G works |
| Sandbox PayNow can't be paid on own phone | Audience uses card `4242 4242 4242 4242`; PayNow beat scripted with two phones |
| Realtime hiccup | Counter also refetches on window focus + 5 s interval as backstop |
| Extraction misreads menu | Review form is editable — fix live, it's a feature ("AI drafts, you confirm") |

## 7. Build order

1. **Day 1 — money round-trip:** schema + `/api/buy` + webhook with real sandbox payment; confirm signature style + payload paths; prove guarded txn with two concurrent test payments on a 1-stock product.
2. Buyer page + Realtime counter (+ multi-phone check).
3. Order status page with fallback poll.
4. Seller console + packing/delivery lists.
5. `/new` builder: extract route + review form.
6. Demo rehearsal: ≥10 phones, last-unit race, projector view, record video (due Mon 20 Jul 23:59).
