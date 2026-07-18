# 07 — Race proof and demo hardening

**What to build:** Evidence that the sold-out moment survives a real room, produced by running the full audience scenario against the deployed app. A scripted concurrency test fires many overlapping sandbox payments at a low-stock product and proves the invariant: exactly `stock_total` orders end PAID, the rest PAID_LATE or PENDING, `stock_sold` never exceeds `stock_total`. Then the human dry run: a fresh drop created through the builder, ≥10 real phones buying via the projected QR, two people deliberately racing the last unit, counter ticking to SOLD OUT on the projector, console settling with zero manual work. Fix whatever the rehearsal shakes out (copy, latency, layout on small phones, QR size).

Also covers the demo-night script from the spec: test card path for the audience, the two-phone PayNow beat (sandbox PayNow can't be scanned from one's own screen), and the recorded 3-minute video (due Mon 20 Jul 23:59) walking the arc: pain → spin up → race → sold out → settle — including showing the HitPay AI builder tools used, which is a stated scoring bonus.

**Blocked by:** 03 — Live scarcity counter · 04 — Order status fallback · 05 — Seller console · 06 — Drop builder.

**Status:** ready-for-agent

- [ ] Concurrency script: N > stock overlapping payments → exactly stock_total PAID, zero oversell, repeatable
- [ ] Last-unit race between two real phones resolves to one Paid and one honest sold-out/refund message
- [ ] Full dry run with ≥10 phones on the deployed URL: builder → QR → race → SOLD OUT → settled console
- [ ] Two-phone PayNow beat rehearsed and working in sandbox
- [ ] 3-minute video recorded and submitted before Mon 20 Jul 23:59, showing HitPay AI tooling used in the build
