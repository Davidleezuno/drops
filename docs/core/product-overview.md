# Drops — Product Overview

**The storefront, reimagined for people instead of corporations.**

HitPay Build Night · July 2026

---

## Thesis

Commerce distribution is shifting from corporations to individuals. Influencers, creators, thought leaders, live sellers, and paid partnerships now drive discovery — people with a following, not brands with a domain. But commerce infrastructure hasn't followed. Storefronts are still built for companies: permanent catalogues, SKU databases, config panels, themes. They assume the *store* is the anchor and traffic flows to it.

For sellers whose distribution is their audience, the anchor is the **person**. Their inventory is fluid — tonight's bake, this week's import run, the collab piece, whatever is on the livestream right now. What they need isn't a store. It's the ability to spin up a **moment of commerce** — limited stock, a time window, one link — and tear it down when it's over.

That's the conceptual shift: **from static stores to dynamic drops.**

A drop is not a smaller store. It's a different object: it has stock that races to zero, a window that expires, buyers who claim before they pay, and a settlement that must reconcile itself — because the seller is one person, not an ops team.

## Problem

Singapore's conversational sellers — home-based F&B, live sellers on TikTok/IG/Facebook, group-buy organisers, creators doing merch runs — already sell this way. They announce to a following and fulfil over WhatsApp:

> Customer asks what's available → seller sends a menu image → back-and-forth on items, address, delivery → seller calculates the total → customer PayNow-transfers a screenshot → seller manually matches payment to order.

**A real $48 order took 10 WhatsApp messages, a hand-calculated delivery fee, and a payment screenshot.** Multiply by 50 buyers in a two-hour live session.

Three structural pains:

1. **No storefront that fits** — store builders (including HitPay's) assume permanent catalogues and manual setup; their inventory changes every drop.
2. **Manual order capture** — every claim is negotiated message by message, with no protection against overselling limited stock.
3. **Manual reconciliation** — payment screenshots matched to orders by hand, worst in the chaotic hour after a live ends.

TikTok Shop solves this only inside TikTok — and locks the seller, the customer relationship, and the payment flow into its walls. Sellers with audiences across WhatsApp, Instagram, Telegram, and offline have nothing.

## Solution

**Drops** lets anyone with a following spin up a live, self-expiring storefront in under a minute — and the drop runs itself.

**Spin up.** The seller uploads the image they already send customers — a menu card, product photos, a live-sale prep sheet. AI extracts products, prices, and variants, asks only what blocks checkout (stock, window, delivery), and generates one link:

```
drops.sg/rotiwife/tonight
```

**Share.** The link goes wherever the audience is — WhatsApp status, IG bio, Telegram group, on-screen during a livestream. One link, every platform.

**The drop runs itself:**

- **Claim-to-pay** — a buyer taps *Claim*, stock is reserved for 5 minutes, a unique HitPay payment request is issued. Webhook confirms → sold. Timer expires → stock releases to the next buyer. No overselling, no screenshots.
- **Live scarcity** — every buyer's phone shows real stock: *8 left… 3 left… SOLD OUT*, driven by paid orders plus active claims, updating in real time.
- **Expiry** — when the window closes, the link dies, unpaid claims auto-release, and stray payments are flagged for refund.

**Settle.** The seller ends with a reconciled order list — who paid, what, where to deliver — plus a packing list. Zero manual matching.

```
Before:  10 messages per buyer → hand-calculated totals → screenshot matching
After:   1 link → buyers claim, race, pay → reconciled orders + packing list
```

AI works before the transaction (setup in 60 seconds). HitPay works during and after (payment requests, webhook-confirmed state, refunds). The drop mechanics in between are the product.

## Target user

Individuals and micro-teams whose distribution is an audience, not a domain: live sellers, home-based F&B, creators doing limited merch runs, group-buy organisers, collab/partnership drops. Squarely HitPay's core SMB ICP — operationally lean, no developer, currently reconciling PayNow screenshots by hand. Deliberately *not* established TikTok Shop merchants with warehouse-fulfilled SKUs.

## Core product (P0 scope)

1. **Drop builder agent** — upload image → AI extracts products/prices/variants → asks blocking questions only (stock, window, delivery fee, pickup) → drop link live. Tools: `extractProducts`, `askUserQuestion`, `createDrop`.
2. **Buyer drop page** — mobile-first, no account. Current products, live stock counter, *Claim* button, countdown timer, delivery details, HitPay checkout (PayNow / cards / GrabPay).
3. **Claim engine** — reservation with TTL (`expires_at` checked on read), unique HitPay payment request per claim carrying the order reference, paid state set **only** by validated webhook, expiry releases stock atomically.
4. **Seller console** — live order feed (Claimed → Awaiting payment → Paid), stock remaining, end-of-drop packing and delivery list. One-click refund as stretch.

**Not building:** WhatsApp API, TikTok integration, livestream video, themes, CRM, customer accounts, multi-merchant, background job infrastructure. Roadmap, not demo.

## Architecture

```
Seller uploads image
  → Vision extraction → clarification agent → drop config
  → drops.sg/{seller}/{drop} live

Buyer opens link
  → Realtime drop state (stock = total − paid − active claims)
  → CLAIM → reservation row (TTL) → HitPay Payment Request (order ref)
  → HitPay checkout

HitPay webhook (signature-validated)
  → match order ref → mark PAID → decrement stock → realtime fan-out
Claim expiry → release reservation → stock returns → fan-out
```

Deterministic state machine owns money and stock; AI never decides whether a payment succeeded or how many units remain. Realtime sync via Supabase; claims as TTL rows, no cron.

## Demo (3 min) — the audience is the demo

| Time | Beat |
|---|---|
| 0:00–0:25 | **Pain.** Real WhatsApp thread: 10 messages, hand-calculated $48, PayLah screenshot. "Now imagine 50 buyers in a live session." |
| 0:25–1:00 | **Spin up.** Upload menu image → AI extracts Set A/$35, Set B/$65 → answer stock + window → drop link live in 60 seconds. |
| 1:00–2:20 | **The drop.** QR on the projector. *The audience buys.* Phones scan, claims race the timer, the projected page ticks 12 → 7 → 3 → **SOLD OUT** as sandbox payments land and webhooks flip orders to Paid — live, concurrent, real. |
| 2:20–3:00 | **Settle.** Seller console: every order paid and reconciled, packing list generated. "Ten messages per buyer became one link. Storefronts used to be built for corporations — this one is built for a person with a following." |

## Why this wins

- **Technicality** — concurrent claims, TTL reservations, idempotent webhook-driven state, realtime fan-out. A state machine, not a form.
- **Impact** — attacks the seller's highest-stakes moment (limited stock, many buyers, minutes to convert) and kills reconciliation entirely; HitPay primitives are the mechanism, not a bolt-on.
- **Creativity** — a live audience-participation demo *proves* the concurrency instead of claiming it, and the store→drop reframe gives judges a thesis, not just a feature.

## Roadmap

Live-session mode (a drop *is* a live sale): spotlight products mid-stream, flash pricing, session carts that consolidate one buyer's claims into a single delivery → post-live reconciliation copilot → customer memory (returning-buyer addresses, one-tap rebuy) → collab drops with split settlement via HitPay payouts. One line covers it: *point any livestream at a drop link and it's live commerce on every platform TikTok doesn't own.*