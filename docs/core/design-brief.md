# Drops — Design Brief

**Status:** current, post design-overhaul (July 2026). This documents the direction as built; tokens live in [app/globals.css](../app/globals.css), components in `components/ds/`.
**Product docs:** [product-overview.md](product-overview.md) · [product-spec.md](product-spec.md) · [tech-spec.md](tech-spec.md) · [future-ideas.md](future-ideas.md)

---

## 1. What Drops is

Drops lets anyone with a following — a home baker, a TikTok live seller, a creator doing a merch run — spin up a live, self-expiring storefront in under 60 seconds. One link goes out to WhatsApp, Instagram, Telegram; buyers race a live stock counter and pay via HitPay; the seller ends the night with reconciled orders and a packing list.

The thesis: **Drops is commerce built around a person.** A drop is the unit of person-anchored commerce — usually a time-bound moment, sometimes an ongoing link ([future-ideas.md §3](future-ideas.md)). Urgency is a mode the data activates, not the identity.

## 2. Who sees it

- **Buyers** — mobile, arriving cold from a chat link, ~10 seconds of attention. Singapore audience: PayNow mental model, SGD prices.
- **Sellers** — one person, not an ops team. Sets up on a phone, then watches the console mid-chaos. Needs calm, glanceable clarity.
- **The live room** — the buyer page gets projected during livestreams and demos. Counter, countdown, and SOLD OUT must read from 10 metres.

## 3. The direction: "clean court, warm flame"

**In one line: Nike-storefront cleanliness with the warmth of a person selling to you.**

The reference blend:

- **From modern retail (the "clean court"):** generous white space, confident display type, ink-black pill CTAs, prices that state themselves plainly, one calm list instead of a grid of chips. The interface is a well-lit shop floor — the product and the person carry the color.
- **From the person (the "warm flame"):** warm-toned neutrals rather than cool grays, a single flame-orange accent, a display face with genuine character, and honest, human copy. It should feel like buying from Sarah, not shopping a platform.

Personality targets, in priority order: **personal** (the seller's name and photos are the hero; Drops is the stage, the seller is the act) · **effortless** · **trustworthy with money** · **alive when it's live** · **honest urgency only** (no fake timers, no fake social proof — see the guardrails in [future-ideas.md](future-ideas.md)).

Anti-references — what this must *not* feel like:

- Shopify-lite / SaaS admin (config-panel energy, cool grays, cards everywhere)
- Artisan-craft cliché (cream paper, serif headlines, "handmade candle shop" calm) — **this was the pre-overhaul failure mode**; tasteful, but it whispered while the product sprints
- Sketchy flash-sale spam (blinking reds, fake countdown widgets)
- Hypebeast streetwear-drop costume (all-black, all-caps aggression) — our sellers sell laksa and bakes; borrow drop culture's energy, not its uniform

## 4. The surfaces

In order of design importance:

### 4.1 Buyer drop page `/{seller}/{drop}` — THE product

The base is a clean, personal storefront that is complete without any urgency chrome. The live layer switches on only when the data calls for it:

- **The scarcity escalation ladder** (`StockBadge`): at full stock the count recedes to quiet mono inventory text (`6 left`); low stock (≤3) turns it into an amber soft-pill (`only 2 left`); sold out is an ink pill (`SOLD OUT`). Every threshold change fires `animate-tick`. The counter is the page's heartbeat in live mode and ambient info otherwise.
- **The header**: the drop URL in mono with the slug in flame, then the seller's name huge in the display face. The link *is* the brand; the person is the hero.
- **The countdown** (`LivePill`): ink pill, breathing green live-dot, mono numerals. Only renders on time-bound drops.
- **Buy is two taps.** The Buy pill is full-width ink; the inline form keeps labels above inputs and the total in a muted panel with a mono price. Every added visual decision competes with buy-to-checkout speed.

### 4.2 Seller console `/manage/[token]`

Calm and glanceable while 50 orders land. The overhaul's rule: **one calm list beats a grid of chips.**

- Header: seller name, URL, one status row (countdown pill + close time), one outline "End drop now" button. Nothing else.
- Stock is a single card list (name/variant left, `sold/total` + badge right), not a card grid.
- Section headings are plain display type. **No eyebrow labels** — the one exception is the alarm-red "Action required" over `PAID_LATE` refunds, which is semantic, not decorative.
- `PAID_LATE` is the product's only alarm: alarm-tinted cards pinned above everything, unmissable but not panicked.

### 4.3 Drop builder `/new`

Photo in, structured products out, live link in under 60 seconds. AI output is framed as a draft you confirm — editing an extraction feels like a feature, not a failure. The success screen is the seller's payoff: link + QR presented like a ticket to their own event, worth screenshotting.

### 4.4 Order status `/order/[id]`

Pure trust surface. "Confirming payment…" must feel active, never broken; PAID is unambiguous and calm — a receipt, not a celebration bigger than the purchase.

### 4.5 Landing page `/`

One headline, one pitch, one CTA. Minimal budget.

## 5. The design language (as built)

### 5.1 Color

Light-mode-first (chat links open in daylight; food photos need honest color). Dark tokens exist in `globals.css` for future toggling; v1 ships light-only.

- **Neutrals:** clean warm white ground (`--background`, oklch ~0.987 hue 84), pure-white cards, warm ink foreground. Warm-toned throughout — never cool gray — but crisp, not cream. One neutral ramp per page, no drift.
- **Ink is the CTA.** `--primary` is the ink near-black; every primary action is an ink pill. This is the confident-retail move and it keeps the accent scarce.
- **Flame is the accent** (`--flame`, oklch ~0.63 chroma 0.18 hue 40): the drop slug, builder highlights, focus rings, and money-landing moments. Never the CTA fill, never decoration. One accent, locked, whole page.
- **Semantic drop states** carry the event layer: `--live`/`--live-soft` (green: live dot, paid), `--low`/`--low-soft` (amber: low stock), `--alarm`/`--alarm-soft` (red: PAID_LATE, destructive). Scarcity escalation and payment states never share ambiguous colors.

### 5.2 Typography

Three faces, three jobs:

- **Bricolage Grotesque** (`font-display`) — headlines, seller names, posters, section headings. Characterful but modern; warmth without serif-craft cosplay. Weights up to 800 (`font-extrabold` is the ceiling; there is no italic — never fake one).
- **Instrument Sans** (`font-sans`) — everything workhorse: products, forms, body, buttons.
- **Geist Mono** (`font-mono`) — **every number the machine owns**: prices, stock counts, countdowns, URLs, timestamps, order ids. Always `tabular-nums` so ticks never jitter. Numbers are mono, words are sans — the crowd, the clock, and the money all speak the same typographic language.

### 5.3 Shape

One documented rule, applied everywhere: **buttons are full-pill · cards are rounded-2xl · inputs are rounded-lg.** Pills also carry all status chips (LivePill, StockBadge, StatusPill). No other radii.

### 5.4 Motion

Motion is reserved for real events; it is how "live" is communicated, and it means nothing if idle decoration moves too.

- `animate-tick` (scale pulse, 0.5s) — a counter changed: stock, viewer count, totals.
- `animate-rise` (fade + 12px rise, 0.7s, staggered ~40–60ms) — something real arrived: page entry, a new order row, a toast.
- The live-dot ping on `LivePill` is the one persistent animation, and it signals a genuinely open channel.
- Everything else is still. Hovers/actives are subtle (`translate-y-px` press). All motion respects `prefers-reduced-motion`.

### 5.5 Terminal states are posters

SOLD OUT, drop ended, and PAID are designed as compositions, not error messages (`Poster`). SOLD OUT is the demo's money shot: ink card, huge extrabold display caps, slight stamp tilt — built to flip on a projector in front of a room. Ended is quiet card-on-border; PAID is soft-green calm.

### 5.6 Copy register

Plain, human, specific. "Everything's gone. Follow Roti Wife for the next drop." No filler verbs (elevate, seamless, unleash), no fake precision, no em-dashes in UI strings. Emoji only where the surface is social-native (reactions — see [future-ideas.md §1c](future-ideas.md)); never in chrome.

## 6. How to extend it

When adding a surface or feature, in order:

1. Does it need to exist on screen at all? (Console lesson: deleting the chip beat styling it.)
2. Default to the quiet register: sans words, mono numbers, no accent. Let data escalate it.
3. New status → does an existing semantic color own it? Only mint a token if genuinely new.
4. New number → mono, tabular, ticks on change, threshold below which it hides.
5. Flame only if it's identity or money. When in doubt, ink.
