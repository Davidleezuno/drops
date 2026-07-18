# 04 — Order status page with webhook-miss fallback

**What to build:** After paying, the buyer lands back on our order status page. If the webhook has already processed, they immediately see "Paid ✓" with their order summary (items, qty, total, fulfilment). If not, they see "Confirming payment…" which resolves itself: the page re-checks our database every couple of seconds, and after ~10 seconds of PENDING the server asks HitPay directly for the payment-request status (the docs-sanctioned polling endpoint) and funnels a completed result through the *same* guarded transaction the webhook uses — same idempotency, same PAID/PAID_LATE outcome.

The page reflects only database state. The redirect itself is never trusted as proof of payment (HitPay's docs are explicit that it's spoofable) — a hand-crafted redirect URL for an unpaid order must keep showing "Confirming…", not "Paid".

**Blocked by:** 02 — Money round-trip.

**Status:** ready-for-agent

- [ ] Paid order → status page shows Paid ✓ with order summary
- [ ] Webhook artificially delayed/disabled → page still resolves to Paid via the status-poll fallback, stock decremented exactly once
- [ ] Fallback goes through the same guarded transaction: replaying it or racing it with the webhook never double-decrements
- [ ] Visiting the status URL of an unpaid order shows "Confirming…", never Paid
- [ ] PAID_LATE order shows an honest "drop sold out — you'll be refunded" state to the buyer
