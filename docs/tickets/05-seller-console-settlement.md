# 05 — Seller console: live feed and self-reconciling settlement

**What to build:** The seller opens their secret console URL (`/manage/{token}` — the unguessable token is the only auth, per the locked decision) and watches the drop run itself: orders flipping Pending → Paid live, stock remaining per product, countdown. Any PAID_LATE order is pinned at the top in red with a "refund in HitPay dashboard" note. When the window passes or the seller taps "End drop now", the console becomes the settlement view: an aggregated packing list (sum of qty per product) and a delivery list (every paid order with buyer name, contact, address/pickup), each with a copy button. Zero manual matching — this is the "Settle" beat of the demo.

Console reads go through the server gated by the token; buyer PII never travels through the anon-readable tables.

**Blocked by:** 02 — Money round-trip.

**Status:** ready-for-agent

- [ ] Console URL with a wrong token shows nothing (404), correct token shows the drop
- [ ] Orders appear and flip to Paid live while payments happen, without refresh
- [ ] PAID_LATE orders pinned and visually flagged with refund note
- [ ] Ended drop (window passed or "End drop now") shows packing list + delivery list matching the paid orders exactly
- [ ] Copy buttons produce paste-ready text for packing and delivery lists
