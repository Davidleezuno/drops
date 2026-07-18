# Drops — Design System

How to build UI in this repo. Companion to [design-brief.md](design-brief.md) (the *why*); this is the *how*. Tokens live in [globals.css](../app/globals.css), primitives in `components/ui/` (shadcn, Base UI base), domain components in `components/ds/`.

**The rule of altitude:** pages compose `components/ds/*`; `ds` components compose `components/ui/*` + tokens; only `globals.css` knows raw color values. Never use ad-hoc palette classes (`text-stone-500`, `bg-red-100`) in pages — if a color isn't a token, it isn't in the system.

## Voice

Warm paper + ink, one flame accent, semantic state colors. Light mode only in v1 (a `.dark` block exists but nothing toggles it). Two registers, one language: the base storefront is quiet and personal; urgency (countdown, scarcity escalation, posters) activates only from data.

## Fonts

| Token | Face | Role |
|---|---|---|
| `font-display` | Fraunces | The person & the poster: seller names, headlines, terminal states (SOLD OUT / ended / paid) |
| `font-sans` | Instrument Sans | Everything else: body, forms, buttons |
| `font-mono` | Geist Mono | The machine: prices, counters, timers, URLs, IDs, statuses. Always with `tabular-nums` when values change |

Rule of thumb: if it's *who*, it's Fraunces; if it's a *number or state*, it's mono; otherwise sans. Don't set UI chrome in Fraunces.

## Color tokens

shadcn's standard tokens (`background`, `foreground`, `card`, `primary`, `muted`, `border`, `destructive`, …) are all mapped — use them for surfaces and chrome. `primary` is the flame accent: reserve it for the primary action (Buy) and small identity moments (the drop slug). One accent per screen.

Drop-state tokens, added on top:

| Token | Use |
|---|---|
| `live` / `live-soft` | Live dot, PAID state, paid poster |
| `low` / `low-soft` | Low-stock escalation ("only 3 left") |
| `alarm` / `alarm-soft` | PAID_LATE only — the product's single alarm. Don't use for anything else |

Sold-out is not a color: it's ink (`foreground` background, `background` text) — a poster, not a warning.

## Motion

Reserved for real events; everything else stays still.

- `animate-rise` — entrance for posters and list items (stagger with `animationDelay`, ~60ms steps).
- `animate-tick` — scale-pop for a number that just changed. Ticket 03 (realtime counter): re-mount the changed element with `key={remaining}` so the tick fires on each update.
- The live dot pulses via `animate-ping` inside `LivePill`.

## Domain components (`components/ds/`)

| Component | What it is | Notes |
|---|---|---|
| `Shell` | Page container | `width="drop"` (mobile buyer, max-w-md) or `"console"` (seller, max-w-3xl) |
| `DropHeader` | Seller-as-hero header | URL eyebrow (`drops.sg/{seller}/{slug}`), Fraunces name; pills go in children |
| `LivePill` | Ink pill + breathing green dot | Wraps `Countdown` on time-bound drops; omit entirely on open-ended drops |
| `Price` | SGD amount | Mono, tabular; formatter is `sgd` in `lib/format.ts` |
| `StockBadge` | Scarcity ladder | `plenty` (quiet mono text) → `low` (amber pill, ≤3) → `soldout` (ink pill). Exposes `stockState()` + `LOW_STOCK_THRESHOLD` |
| `ProductRow` | One product in a drop | Sold-out rows recede (opacity), never disappear |
| `StatusPill` | Order status | `PENDING` (quiet) / `PAID` (green) / `PAID_LATE` (solid alarm) — for console + order status pages |
| `Poster` | Terminal states as compositions | `sold-out` (ink, stamp tilt) / `ended` (quiet card) / `paid` (green tint) |

## Per-ticket guidance

- **02 Buy flow:** form = shadcn `Input`/`Label`/`Select` + `Button` (flame primary, `size="lg"` for Buy). Totals via `Price`. The pre-redirect handoff screen is a quiet surface — no urgency styling near money.
- **03 Realtime counter:** `StockBadge` with `key={remaining}` + `animate-tick`; page-level flip to the `sold-out` Poster when everything's gone. The projector is the same page — sizes already assume it.
- **04 Order status:** "Confirming payment…" = quiet card + shadcn `Skeleton` pulse (active, not broken); resolve to `Poster variant="paid"`; PAID_LATE buyer view uses `alarm-soft` card, honest copy.
- **05 Console:** `Shell width="console"`, shadcn `Table` (add via CLI when needed) + `StatusPill`; PAID_LATE rows pinned top. Calm register throughout — no flame except actions.
- **06 Builder:** shadcn form primitives; extracted rows editable inline; success screen presents the link + QR like a ticket (mono URL, flame slug, worth screenshotting).

## Adding primitives

`npx shadcn@latest add <component>` — config is in `components.json` (Base UI base, `base-nova` style). Restyle primitives only through tokens, not by editing `components/ui/` files, so they stay update-able.
