# Drops — Product Spec (Hackathon)

**One link that sells out.** A self-expiring storefront anyone with a following can spin up in 60 seconds — buyers race the stock counter, pay via HitPay, and the seller ends with zero reconciliation.

HitPay Build Night · Demo: 3-min video due 20 Jul, live demo 10 min.

---

## The one thing that must be perfect

**The sold-out moment.** 50 audience phones open one link, buy in sandbox, and every screen ticks 12 → 7 → 3 → **SOLD OUT** in real time as webhooks land. Stock has exactly one source of truth — validated paid webhooks — and the seller ends with a fully reconciled order list, no screenshots, no matching.

If that moment is flawless and everything else is mediocre, we win. The reverse loses.

## Three features. Nothing else.

### 1. Spin up: image → live link

Seller uploads the menu/product photo they already send customers. AI (vision) extracts products, prices, variants. It asks **only what blocks checkout** — stock per item, drop window, delivery fee or pickup — then the link is live:

```
drops.sg/rotiwife/tonight
```

**Quality bar:** under 60 seconds from upload to shareable link, on a phone. Max 3 questions. Extraction errors are editable inline, not re-prompted. No accounts-and-settings detour — seller auth is a magic link, nothing more.

### 2. The drop: buy against a live counter

Mobile-first buyer page, no account, no cart:

- Products with prices, a countdown to window close, and a **live stock counter** (`stock_total − paid`) that updates on every open phone the moment a payment lands.
- Tap **Buy** → name + contact → HitPay checkout (PayNow / cards / GrabPay) with the order's reference number.
- Validated webhook arrives → **PAID**, stock ticks down everywhere.
- Window closes or stock hits zero → page flips to "Sold out / Drop ended", Buy disabled.

**Quality bar:** buy-to-checkout in two taps. Counter latency under 1 second from webhook to phones. Paid state is set **only** by a validated webhook — never by the redirect. A payment that lands after sellout is flagged `PAID_LATE` for refund, never silently kept or lost.

### 3. Settle: the drop reconciles itself

Seller console: live feed of orders flipping Pending → Paid, stock remaining, countdown. When the drop ends: a final order list (buyer, items, contact, delivery/pickup) and an aggregated packing list. Copy-paste ready.

**Quality bar:** zero manual matching. Every paid order carries its buyer details because the payment was born from the order. `PAID_LATE` orders surface at the top with a refund note.

## Explicitly not building

**Claim reservations / TTL holds** — no `expires_at`, no held stock, no expiry sweep. Scarcity is real (only payment decrements stock) and the rare last-unit double-payment resolves through the `PAID_LATE` → refund path instead of a reservation system. One flagged refund is cheaper than a whole TTL state machine.

Also out: WhatsApp/Telegram bots · TikTok or livestream integration · themes and customisation · customer accounts or CRM · refund UI (flag + roadmap; API refund if trivial) · recurring billing · analytics · background jobs of any kind.

If a task doesn't make the sold-out moment or the 60-second spin-up better, it's cut.

## How it works

### State machine (deterministic — AI never touches money or stock)

```
Buy tap → ORDER row (PENDING) → HitPay payment request (reference_number = order ID)
  └─ webhook "completed" (signature-validated)
        ├─ stock available → PAID        [atomic decrement, guarded: WHERE paid_count < stock_total]
        └─ already sold out → PAID_LATE  [flagged for refund]

available = stock_total − paid        (computed on read; decremented only in the webhook txn)
Drop window closes → Buy disabled, PENDING orders orphan harmlessly (no money moved)
```

- **One writer:** only the webhook handler mutates stock, in a single guarded SQL statement — the last unit resolves to exactly one PAID no matter how many checkouts race.
- **Idempotent:** webhook events are recorded by ID; a duplicate is a no-op.
- **Honest tradeoff:** between sellout and a stragglers' in-flight payment there is a small oversell window; it converts to a visible `PAID_LATE` flag, not a lost order. Fallback: poll `GET /v1/payment-requests/{id}` if a webhook is slow.

### HitPay integration (sandbox, verified against docs 2026-07)

| Step | Call |
|---|---|
| Buy → payment | `POST https://api.sandbox.hit-pay.com/v1/payment-requests` — header `X-BUSINESS-API-KEY`, form-encoded; `amount`, `currency=SGD`, `payment_methods[]` (paynow_online, card), `reference_number` = order ID, `redirect_url` back to the drop page |
| Confirm | Webhook endpoint registered in Dashboard → Developers → Webhooks, pointed at a **Supabase Edge Function** (public HTTPS — no ngrok on venue wifi); validate `Hitpay-Signature` = HMAC-SHA256 of the **raw body** with that endpoint's salt; match `reference_number` → order |
| Never | Trust `redirect_url` for payment state (docs are explicit: it's spoofable) |

Rate limit 70 payment creations/min — covers a full-room demo. Enable PayNow/cards/GrabPay in sandbox Settings → Payment Methods. Use the HitPay Claude Code plugin / AI skills / CLI (`listen`/`trigger` for local webhook testing) during the build — the demo must show it, and it's a scoring bonus.

### Stack

Next.js on Vercel · Supabase (Postgres + Realtime for counter fan-out, Edge Function for webhook) · Claude vision for extraction. Boring choices; the novelty budget is spent on the sold-out moment.

### Data model (5 tables, no more)

`sellers` (handle, contact) · `drops` (seller, slug, window_ends_at, delivery config, status) · `products` (drop, name, price, variant, stock_total) · `orders` (product, qty, buyer name/contact, status: PENDING/PAID/PAID_LATE, hitpay_payment_request_id) · `webhook_events` (event id, raw payload, processed_at — idempotency + audit).

## Demo (3 min) — the audience is the load test

1. **0:00 Pain** — real WhatsApp thread: 10 messages, hand-summed $48, PayLah screenshot. "Now 50 buyers in a live session."
2. **0:25 Spin up** — upload menu photo on stage, answer stock + window, link live in 60s.
3. **1:00 The drop** — QR on the projector, audience buys in sandbox with test card `4242 4242 4242 4242` (sandbox PayNow needs a second phone to scan the QR — script that beat with two phones or paired neighbours); projected page ticks 12 → 7 → 3 → **SOLD OUT** as webhooks land.
4. **2:20 Settle** — console shows every order paid and reconciled, packing list done. "Ten messages per buyer became one link."

Rehearse with ≥10 real phones before the night, including two people racing the last unit.

## Done means

- [ ] Photo → live drop link in <60s, on a phone
- [ ] 10+ concurrent buyers, counter updates <1s after each webhook, exactly `stock_total` orders end PAID
- [ ] Paid state only via signature-validated webhook; duplicate webhooks are no-ops
- [ ] Payment landing after sellout → `PAID_LATE`, flagged in console, never lost
- [ ] Window close disables Buy and freezes the order list
- [ ] End-of-drop console needs zero manual reconciliation

## Build order (highest risk first)

1. HitPay sandbox round-trip: payment request → checkout → validated webhook → guarded PAID/PAID_LATE — *day 1, everything depends on it*
2. Buyer page with realtime counter
3. Seller console + settlement list
4. AI drop builder (vision extraction + 3 questions)
5. Polish the demo beat: QR flow, projector view, two-phone PayNow script, rehearsal
