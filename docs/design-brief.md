# Drops — Design Brief

**For:** the designer defining the app's design language
**Product docs:** [product-overview.md](product-overview.md) · [product-spec.md](product-spec.md) · [tech-spec.md](tech-spec.md)

---

## 1. What Drops is

Drops lets anyone with a following — a home baker, a TikTok live seller, a creator doing a merch run — spin up a **live, self-expiring storefront in under 60 seconds**. They upload the menu photo they already send customers, AI extracts the products, and one link goes out to WhatsApp, Instagram, Telegram:

```
drops.sg/rotiwife/tonight
```

Buyers open the link on their phones, race a **live stock counter** (*8 left… 3 left… SOLD OUT*), pay via HitPay (PayNow / card / GrabPay), and the seller ends the night with a fully reconciled order list and a packing list. No screenshots, no manual matching.

The thesis in one line: **storefronts were built for corporations; Drops is commerce built around a person.** When the anchor is a person rather than a domain, one permanent store is the wrong shape — a person runs *multiple lightweight storefronts at once*. Some are time-bound moments (tonight's bake, a live session, a garage sale); others are ongoing (a medium-term paid partnership with a brand, a standing merch link). A drop is the unit of person-anchored commerce, not necessarily an ephemeral one.

The design language must carry that thesis. If the app looks like Shopify-lite, we've failed. But don't over-rotate the other way either: **urgency is a mode, not the identity.** The base language is a clean, personal storefront that's effortless to spin up; scarcity and countdown are an escalation layer that lights up *when the data says so* — a closing window, stock running low — and stays dormant on drops that aren't time-bound.

## 2. Who sees it

Two very different users share the product:

- **Buyers** (the majority of eyeballs): mobile, arriving cold from a chat link, no account, no onboarding. They give us ~10 seconds of attention. Singapore audience — PayNow is the default mental model, English UI, prices in SGD.
- **Sellers** (one person, not an ops team): sets up on a phone in a spare moment, then watches the console during the chaos of a live session. They need calm, glanceable clarity while 50 orders land.

There is also a **third audience unique to this product**: a live room. The buyer page gets projected on a screen during livestreams and at our demo, with an audience watching the counter tick down. The design must work at projector distance, not just at arm's length.

## 3. Personality

**A drop should feel like a person selling to you, not a company's catalogue.**

Target feeling, in order of priority:

1. **Personal** — the seller's name and their food/product photos are the hero, not our chrome. Drops is the stage; the seller is the act. A buyer should feel "I'm buying from Sarah", not "I'm on a platform".
2. **Effortless** — for the seller, spinning up a storefront must feel like sending a message, not configuring software. The design should make "run three storefronts at once" feel as light as having three links.
3. **Trustworthy with money** — buyers hand over real payment to a stranger from a chat link. The payment moment must feel institutional-grade: clear totals, clear states, no ambiguity about whether you've paid.
4. **Alive when it's live** — for time-bound drops with racing stock, the page should feel like an event you're in: the counter is a heartbeat, the countdown is real. This is a *mode the data activates*, layered onto the base language — not the default register.
5. **Honest urgency only** — when scarcity shows up, it's because it's real (stock genuinely races to zero). No fake timers, no "3 people are viewing this". A drop without a closing window simply doesn't show one.

Tension to manage: **one language, two registers.** The same storefront skin must serve a calm ongoing partnership page and a frenzied 30-minute live sale. The base is quiet and personal; countdown, counter escalation, and the sold-out moment turn the volume up only when present. Money surfaces (checkout handoff, order status, console) stay quiet in both registers.

Anti-references — what this must *not* feel like:

- Shopify/e-commerce admin (permanent-store energy, config panels, SKU tables)
- Generic SaaS dashboard (cards, cool grays, sparklines everywhere)
- Sketchy flash-sale spam (blinking reds, fake countdown widgets)
- Hypebeast streetwear-drop cliché (all-black, all-caps aggression) — our sellers sell laksa and bakes, not limited Jordans. Borrow the *energy* of drop culture, not its costume.

Useful reference territory: link-in-bio done right (a page that *is* the person), well-crafted local F&B branding (warm, appetising, personal), and — for the live mode specifically — event/ticketing energy and live-sports score UIs (numbers that change with weight).

## 4. The surfaces

Six screens, in order of design importance:

### 4.1 Buyer drop page `/{seller}/{drop}` — THE product

Mobile-first, no account, no cart. Contains: seller name, product list (name, variant, price, photo where available), **live stock counter per product**, **countdown to window close** (when the drop is time-bound), Buy button → name + contact → HitPay hosted checkout.

- **Design the base storefront first**: a clean, personal page that works with no countdown and no scarcity pressure — this is what an ongoing partnership drop looks like, and it must feel complete, not like an event page with the exciting parts missing.
- **Then design the live escalation on top.** The stock counter updates in <1s on every open phone when a payment lands anywhere. Design its states: plenty → running low → last few → **SOLD OUT**. Each threshold escalates feel (weight, colour, motion), and the tick itself deserves a designed transition. In live mode this counter is the page's heartbeat — but at full stock on an open-ended drop it should recede to quiet inventory info.
- **The SOLD OUT / Drop ended state is the demo's money shot.** In the demo, a projected screen flips to SOLD OUT in front of a live audience. This state should be a poster, not an error message. Same for drop expiry: the link "dies" gracefully — the moment has passed, and the design should say so with intent.
- Buy-to-checkout is two taps. Every added visual decision competes with that.
- Must read on a projector across a room: the counter, countdown, and sold-out state need a large-scale mode or simply enough size/contrast to survive projection.

### 4.2 Seller console `/manage/[token]`

Live order feed (Pending → Paid), stock remaining, countdown, then end-of-drop **packing list** and **delivery list** with copy buttons. `PAID_LATE` orders (payment landed after sellout → needs refund) pinned top and unmissable.

- The other volume: calm, scannable, glanceable mid-chaos. Status colour system does the work.
- `PAID_LATE` is the one alarm state in the product — design it to be impossible to miss but not panic-inducing.

### 4.3 Drop builder `/new`

Upload photo → AI-extracted products in an **editable review form** (not a chat) → three blocking fields (stock, window end, pickup/delivery + fee) → publish → success screen with the buyer link big + QR, and the secret console link.

- Should feel like magic under 60 seconds: photo in, structured products out. The review form frames AI output as "a draft you confirm" — editing an extraction error should feel like a feature, not a failure.
- The success screen is the seller's payoff — the link + QR presentation should feel like being handed a ticket to their own event, worth screenshotting and sharing on its own.

### 4.4 Order status `/order/[id]`

Post-checkout landing: "Confirming payment…" → **PAID ✓**. Pure trust surface. The confirming state must feel active (we're checking), never broken; the paid state should be unambiguous at a glance and calm — this is a receipt, not a celebration bigger than the purchase.

### 4.5 Landing page `/`

One job: explain the thesis and route sellers to "Create a drop". Minimal effort here — a headline, the pitch, one CTA. Do not let this consume budget.

### 4.6 Projector/live view

May just be the buyer page at large scale — but treat "legible and dramatic from 10 metres" as a first-class requirement when sizing the counter, countdown, and sold-out state.

## 5. Design language deliverables

We need a small, opinionated system — not a full design system:

1. **Colour** — light-mode-first (chat links get opened in daylight, food photos need honest colour). A base neutral ramp, one confident brand accent, and a **semantic state set** doing heavy lifting: live/available, running-low, sold-out/ended, pending, paid, and the PAID_LATE alarm. Scarcity escalation and payment states must never share ambiguous colours.
2. **Typography** — two jobs: a display voice for the event layer (counter, countdown, SOLD OUT — big numbers with personality) and a workhorse for products, prices, forms, lists. Numbers matter a lot here: tabular figures for prices, counters, and timers so ticks don't jitter.
3. **Motion** — the counter tick, the state escalations, the flip to SOLD OUT, the order feed row arriving, "confirming payment" activity. Motion is how "live" is communicated; specify it (durations, easing, what animates) rather than leaving it to chance. Everything else stays still — motion is reserved for real events.
4. **Core components** — product row/card, stock counter (all states), countdown, primary Buy button (incl. disabled/ended), order status pill, the review-form editable row, QR/link share block, copy-to-clipboard list block.
5. **The three poster states** — SOLD OUT, Drop ended, and PAID ✓ designed as deliberate compositions.

Mockups needed most, in order: buyer drop page (all counter states + sold out), seller console (live + settled), builder review form + success screen, order status. Landing last.

## 6. Constraints

- **Stack:** Next.js + Tailwind CSS v4 + shadcn/ui (Base UI) + lucide icons. Deliver tokens as Tailwind-compatible values (colour scale, type scale, radius, spacing). Custom components are fine where the system demands it (the counter certainly is), but form primitives should lean on shadcn.
- **Timeline:** this is a hackathon build (demo 20 Jul). The system must be implementable in days — few tokens, strong opinions, no bespoke illustration system.
- **Mobile-first, no dark mode** for v1. Test at 360px width and at projector scale.
- **Content reality:** seller-supplied photos will be amateur menu cards and food snaps. The design must make mediocre photos look good (cropping, framing, backgrounds) and survive their absence entirely (text-only products must still feel like a drop).
- **HitPay checkout is hosted** — buyers leave our UI to pay and return. Design the handoff (what they see right before redirect) and the return (order status) so the seam feels intentional.
- **Real-money honesty:** paid state comes only from validated webhooks. Design must never imply payment success before the system confirms it — hence the "confirming…" state.
- No themes/customisation per seller in v1: one strong house style that makes *every* seller look good, personalised only by their name, handle, and photos.

## 7. Success criteria

1. A buyer opening the link cold understands within 3 seconds: who's selling, what's for sale, how much is left, how long they have (if time-bound), and how to buy.
2. The same skin credibly serves both registers: an open-ended partnership drop looks complete and calm, and a live time-bound drop feels like an event — without changing the design language, only which layers are active.
3. The projected SOLD OUT moment reads as a designed climax from the back of a room — audible-gasp material.
4. The seller console can be understood at a glance mid-livestream; PAID_LATE cannot be missed.
5. A screenshot of any screen is recognisably Drops — the type, the state colours, the personal framing carry identity without a logo.
6. Nothing in the language pulls toward "corporate store": no catalogue chrome, no config-panel energy. Every drop reads as *a person selling*, whether it lasts an hour or a season.
