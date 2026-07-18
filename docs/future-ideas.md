# Drops — Future Ideas

Companion to [product-overview.md](product-overview.md). Ideas explored after v1, kept here so they inform the roadmap without bloating P0. Ranked and guard-railed so scope decisions stay easy under deadline.

---

## The social layer: buying together

**Framing.** A store is a place; a drop is an event; events have a crowd. v1 proves scarcity (*3 left*) but the crowd is invisible — every buyer experiences the race alone. Making the crowd visible is why TikTok Live converts, and shipping that energy off-platform — no video required — is the roadmap thesis ("point any livestream at a drop link") landing on the drop page itself.

Positioning line: **"Shopify built checkout for shopping alone. Drops is checkout for buying together."**

**Infra note.** The buyer page (`app/[seller]/[drop]/drop-storefront.tsx`) and manage console already hold open Supabase Realtime channels for stock changes. Presence and broadcast ride the same channels — all three features below are incremental, not new infrastructure.

### Ranked by demo-value per hour of work

1. **Live viewer count.** Supabase Presence on the existing channel: `track()` on join, count presence state. Killer UI is pairing it with stock: **"41 watching · 5 left"** — the entire psychology of a drop in one line, and it makes the race legible on the projector before it starts.
2. **Purchase/claim announcements.** Toast stream on every buyer's phone — *"Someone just claimed Set B 🔥" / "2 sold in the last minute."* Events already exist (claims + webhook-confirmed payments); needs a broadcast + toast component. **Privacy rule: anonymous or first-name-only.** Full names on a public page is a misstep.
3. **Emoji reactions.** TikTok-style floating hearts via broadcast. Most fun, least commercial — but spectacle earns real points in a 3-minute video (reactions raining while the counter ticks to SOLD OUT is the thumbnail moment). Build last, timebox to ~2 hours, cut without guilt.

### Guardrails

- **Every number is real.** No seeded viewer counts, no fake purchase ticker. The pitch is that the state machine is honest (webhook-confirmed, no overselling); the social layer must clear the same bar. Fake social proof is the dark pattern this space is infamous for — being the honest version is a differentiator worth saying out loud.
- **The social layer serves the race; it never replaces it.** The beat that must be flawless is still claim → race → expire → release → SOLD OUT. Presence and reactions make that beat louder. Under time pressure, cut from the bottom of the ranked list up.

---

## Uncapped drops: the second scarcity axis

The drop primitive has **two scarcity axes — stock and time** — and a seller sets one, the other, or both.

- For the core ICP, "unlimited stock" is usually a myth: home F&B is capped by production capacity, live sellers by the import run, group buys by MOQ. The stock question is the product protecting a one-person operation from over-committing.
- But truly uncapped drops degrade gracefully: reservations idle (nothing to hold — just pay), and what remains is a **time-boxed order link** — window closes, orders captured, payments webhook-confirmed, packing list generated. Still kills order capture and reconciliation.
- The counter survives by flipping from scarcity (*3 left*) to social proof (*47 sold*) — which uncapped sellers actually want on screen. With the social layer above, social proof becomes the urgency engine when stock can't be.

**Not P0.** Uncapped mode weakens the demo (no race, no SOLD OUT) and shrinks differentiation toward "payment link with a deadline." Ship as a config toggle later. Judge-question answer, one line: *"Sellers who don't cap stock still get a self-expiring order link with webhook reconciliation — the claim engine just has nothing to referee."*

---

## Parked adjacent ideas

- **Group-buy organiser settlement** — collect from N people, track who's paid, auto-refund everyone if MOQ fails. Adjacent to the existing claim/webhook/refund machinery; the strongest roadmap slide, not a pivot.
- **Deposit-gated bookings** (no-show protection for hairdressers, clinics, tuition) — real pain, HitPay-native, but thin as a standalone; a drop with services as SKUs gets most of the way there.
