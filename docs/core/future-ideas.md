# Drops — Future Ideas

Companion to [product-overview.md](product-overview.md). Post-v1 features, written as a product/design brief plus a high-level tech spec so implementation can start without re-deriving intent.

Updated July 2026, after the design overhaul. Everything below is specced against the current design language, summarised here because every feature must land inside it:

> **The design language ("clean court, warm flame").** Clean warm white + ink; ink pill CTAs; one flame accent reserved for the brand and live moments; Bricolage Grotesque display, Instrument Sans UI, Geist Mono for every number. Buttons are full-pill, cards rounded-2xl, inputs rounded-lg. Motion is reserved for real events (`animate-tick` on counter changes, `animate-rise` on entry) and always respects reduced-motion. The console lesson from the overhaul: one calm list beats a grid of chips — new features must not re-clutter what we just cleaned.

---

## 1. The social layer: buying together

### Product framing

A store is a place; a drop is an event; events have a crowd. v1 proves scarcity (*3 left*) but the crowd is invisible — every buyer experiences the race alone. Making the crowd visible is why TikTok Live converts, and shipping that energy off-platform — no video required — is the roadmap thesis ("point any livestream at a drop link") landing on the drop page itself.

Positioning line: **"Shopify built checkout for shopping alone. Drops is checkout for buying together."**

### Design principles for the whole layer

1. **Every number is real.** No seeded viewer counts, no fake purchase ticker. The pitch is that the state machine is honest (webhook-confirmed, no overselling); the social layer must clear the same bar. Fake social proof is the dark pattern this space is infamous for — being the honest version is a differentiator worth saying out loud.
2. **The social layer serves the race; it never replaces it.** The beat that must be flawless is still claim → race → expire → release → SOLD OUT. Presence and reactions make that beat louder, never busier.
3. **Numbers are mono, words are sans.** Crowd counts render in Geist Mono `tabular-nums` and tick with `animate-tick`, exactly like stock. The crowd speaks the same typographic language as the inventory.
4. **Nothing social may block buying.** Social UI is `pointer-events-none` overlay or lives in the header status row. The Buy pill is sacred.
5. **Quiet by default.** Each element has a threshold below which it renders nothing. An empty room should look like v1, not like a party nobody came to.

### 1a. Live viewer count

**What.** The number of people currently on the drop page, paired with stock — **"41 watching · 5 left"** is the entire psychology of a drop in one line, and it makes the race legible on the projector before it starts.

**Design direction.**
- Lives in the header pill row as a second, quieter element beside the `LivePill` countdown — not inside it. A `secondary`-toned pill: a lucide `Eye` glyph, then `41 watching` in mono tabular. Ambient status; the countdown keeps the urgency.
- Product cards do not change. The "41 watching · 5 left" pairing is the projector and marketing read, not extra chrome on every card.
- **Threshold: hide below 3.** "1 watching" is worse than silence. Appears with `animate-rise`; count changes fire `animate-tick`.
- The seller console header gets the same number — watching demand build before the window opens is the seller's dopamine and the retention hook.

### 1b. Claim and purchase announcements

**What.** A toast stream on every buyer's phone when someone claims or a payment lands — the footsteps-behind-you feeling that makes scarcity credible. Events already exist (claims + webhook-confirmed payments).

**Design direction.**
- Bottom-anchored toasts above the safe area, styled as the same material as product cards: card-white, rounded-2xl, border, small shadow. Words in sans, quantities in mono: `Mei just claimed Set B` · `2 sold in the last minute`.
- A paid event may carry one flame-colored dot or check; claims stay neutral. Flame marks money landing and nothing else — one accent, locked.
- **Max one toast visible.** New events replace rather than stack. Bursts coalesce: more than 2 events in 30s collapses to a summary line (`3 claimed in the last minute`). Auto-dismiss ~4s. `pointer-events-none`, `aria-live="polite"`.
- **Privacy rule: first name only, or anonymous.** Derived server-side from `buyer_name` (first token, truncated); contact details never leave the server. Missing or odd names fall back to "Someone". Full names on a public page is a misstep.
- Reduced-motion: fade only, no slide.

### 1c. Emoji reactions

**What.** TikTok-style floating reactions on the drop page. Most fun, least commercial — but spectacle earns real points in a 3-minute video (reactions raining while the counter ticks to SOLD OUT is the thumbnail moment). Build last, timebox to ~2 hours, cut without guilt.

**Design direction.**
- One trigger: a fixed bottom-right pill (outline style, heart glyph). Tap fires a reaction; hold rapid-fires with client-side throttle. This is the one surface where the product is allowed to be playful with emoji — it is social-native by definition. Offer at most 2–3 (❤️ 🔥), never a picker.
- Reactions float up the right edge inside a single `pointer-events-none` layer: transform/opacity only, slight horizontal drift, gone in ~2s. Cap ~20 live nodes; overflow increments a small mono counter chip beside the trigger instead of spawning more DOM.
- Reduced-motion: no floaters; the counter chip ticks instead.
- Nothing persists. Reactions are not stored, tallied per drop, or reported to the seller. Pure atmosphere.

### Ranked build order

Demo-value per hour of work: **viewer count → announcements → reactions.** Under time pressure, cut from the bottom of the list up.

---

## 2. Social layer — high-level tech spec

### Channel topology

The buyer page (`app/[seller]/[drop]/drop-storefront.tsx`) and manage console already hold open a Supabase Realtime channel per drop for `postgres_changes` on `products`. The social layer rides the same connection — incremental, not new infrastructure.

- One channel per drop (extend the existing channel, or a sibling `drop-{id}-social`).
- **Presence** (viewer count): each buyer page `track()`s an anonymous session id (random UUID in `sessionStorage`; no cookies, no PII). Count = size of presence state; both surfaces subscribe to `presence` sync events.
- **Broadcast** (announcements): **server-emitted only.** The `/api/buy` route broadcasts `claim`, the HitPay webhook handler broadcasts `paid`, both via the service-role client. Clients never emit these — a client-forgeable purchase ticker would violate the honesty guardrail at the protocol level.
- **Broadcast** (reactions): client-emitted `react` events, throttled client-side (~4/s), rendered best-effort. Untrusted by design; they carry no facts.

### Event payloads (sketch)

```ts
type SocialEvent =
  | { type: 'claim'; firstName: string; productName: string; qty: number; at: string }
  | { type: 'paid';  firstName: string; productName: string; qty: number; at: string }
  | { type: 'react'; emoji: 'heart' | 'fire'; at: string }
```

`firstName` is truncated server-side before broadcast. No order ids, no contact details, no amounts on the wire.

### Client shape

- A `useDropSocial(dropId)` hook owns presence + broadcast subscriptions and exposes `{ watching, lastAnnouncement, react() }`. UI components stay pure renderers.
- Coalescing and the one-visible-toast rule live in the hook (small ring buffer + 30s window), not in the toast component.
- All animation is transform/opacity; reaction floaters share one fixed overlay layer.

### Degradation and failure

- Websocket blocked (venue wifi, strict browsers): presence and broadcast are silently absent and the page renders exactly as v1. The social layer must be additive at runtime, not just in scope.
- Reconnect: presence self-heals on sync; missed announcements are simply lost. They are atmosphere, not state — never re-derive them from the DB.
- The projector view is just the buyer page on a big screen; no special mode.

### Effort

Viewer count ~half a day; announcements ~1 day (server emit points + toast component + coalescing); reactions ~2 hours, timeboxed.

---

## 3. Both axes optional: from drop to permanent storefront

The drop primitive has **two scarcity axes — stock and time.** v1 requires both. The roadmap makes each optional, which yields a clean 2×2:

| | **Window set** | **No window** |
|---|---|---|
| **Stock capped** | The classic race (P0) | Limited run — lives until sold out |
| **Stock uncapped** | Time-boxed order link | **Permanent storefront** |

- For much of the core ICP a cap is real (production capacity, the import run, MOQ), and the stock question protects a one-person operation from over-committing. But it is not universal: some sellers want the link to just *be their store*. That's a legitimate destination, not a degraded drop.
- Every cell keeps the machinery that matters: structured order capture, webhook-confirmed payments, packing and fulfilment lists, zero manual reconciliation. Scarcity is what varies, not correctness.

**The graduation path: the popup that became a store.** The compounding use case is a seller who starts with classic drops, then converts a drop (or spins up a new one) with no window and no cap — one link in the IG bio that lives on. Instead of scarcity, the counter becomes **social proof compounded over time**: `312 sold` keeps climbing across months, earned one webhook at a time. Less differentiated than the race, but a strong use case — and it keeps the seller (and their HitPay volume) after the drop moment ends.

**Design direction.**
- Onboarding: stock and window both become optional questions with honest defaults — "How many can you make?" gains a "no limit" answer; "When does it close?" gains a "keep it open" answer. Two taps, no new screens.
- `StockBadge` gains a `sold` mode: `47 sold` in the same mono/tick language as `3 left` — same position, same animation, same honesty bar (paid orders only). On a permanent storefront this is the headline number, ticking up for as long as the link lives.
- No window → no `LivePill`, no countdown, and the "This drop has ended" poster never renders. The page reads as a calm storefront: the existing design already handles this, since urgency chrome only appears when the data calls for it.
- Console: a settled drop gains a **"Keep this link alive"** action — the conversion moment from popup to store. The URL must not change on conversion; the link is the brand. (A slug rename, e.g. `/rotiwife/tonight` → `/rotiwife/shop`, is a separate, explicitly-confirmed action with a redirect from the old slug.)

**Tech sketch.** `stock_total` and `window_ends_at` both become nullable. The claim engine short-circuits reservation when uncapped (nothing to hold — just pay); expiry logic simply never fires without a window; the webhook settlement path is unchanged in all four cells. The lifetime `sold` counter is derived from paid orders, so it inherits the honesty guardrail for free.

**Thesis check.** The original guardrail said anything pulling toward "permanent store" is off-thesis. The resolution: the anchor is still the person and the link — no themes, no catalogues, no SEO, no store builder. A permanent storefront here is a drop that chose not to expire, and it stays one image-upload away from re-running as a race. Weakens the hackathon demo (no SOLD OUT), so still not P0; ship as config later. Judge-question answer, one line: *"Set no cap and no window and the same machinery becomes a permanent storefront — the popup that became a store."*
