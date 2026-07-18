# 02 — Money round-trip: Buy → HitPay checkout → webhook → PAID

**What to build:** A buyer on the seeded drop page taps Buy on a product, picks quantity, enters name + contact (+ address if delivery), and is redirected to HitPay's hosted sandbox checkout with the correct total (price × qty + delivery fee). They pay with test card 4242 4242 4242 4242. HitPay's webhook hits our endpoint, the signature is validated, and the order flips to PAID with stock decremented — visible in the database. This is the riskiest slice; everything else builds on it.

The webhook handler is the **only** stock writer, and its core is one guarded statement (from the tech spec — this encodes the whole concurrency decision):

```sql
update products set stock_sold = stock_sold + :qty
 where id = :product_id and stock_sold + :qty <= stock_total;
-- 1 row updated → order PAID; 0 rows → order PAID_LATE (real money after sellout, flagged, never dropped)
```

This ticket also burns down the spec's known unknown: HitPay documents two signature styles (per-webhook salt in a `Hitpay-Signature` header over the raw body vs. legacy API-key salt in an `hmac` payload field). Register the dashboard webhook, fire a real sandbox payment, and confirm the actual header/salt/payload paths (`reference_number`, `status`) before building on assumptions.

**Blocked by:** 01 — Deployed skeleton serving a seeded drop.

**Status:** ready-for-agent

- [ ] Buy flow reaches HitPay hosted checkout with correct amount and `reference_number` = order id
- [ ] Sandbox card payment flips the order PENDING → PAID and increments stock_sold, driven only by the validated webhook (redirect alone never marks paid)
- [ ] Webhook signature validation confirmed against a real captured sandbox payload; invalid signature → 401
- [ ] Duplicate webhook delivery is a no-op (idempotency via recorded event id)
- [ ] Payment landing when stock is exhausted → order marked PAID_LATE, stock not exceeded
- [ ] Buy is rejected (soft guard) when the drop has ended or remaining stock < qty
