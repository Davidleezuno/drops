# F3 — Per-drop OG image

**Track:** Frontend. **Depends on:** 00 only. Independent of everything else.
**Spec:** `docs/agent-storefront-spec.md` §6.3. Design language: `docs/future-ideas.md` design note.

## Goal

Every drop link unfurls in WhatsApp/Telegram/IG with a designed card: the theme's accent, seller name, `ogCard.headline`, `ogCard.badge`. The link preview *is* the storefront for most buyers — treat this as a first-class design surface.

## Before writing code

`ImageResponse` / `opengraph-image.tsx` conventions change across Next versions — check the installed Next version in `package.json` and its bundled/official docs for the current file-convention API (params typing, size/contentType exports, font loading) before writing the route.

## Files

| File | Change |
|---|---|
| `app/[seller]/[drop]/opengraph-image.tsx` | **New.** Load the drop by `params` (reuse the same fetch the page uses — see `app/[seller]/[drop]/page.tsx`); render 1200×630: seller name in the display face, `ogCard.headline`, `ogCard.badge` as a pill, accent (via `oklchString`) as the single color moment on the clean warm-white court. `theme = null` → same layout with `--flame` orange and drop slug as headline — every drop gets a card, themed or not. Fonts: load Bricolage Grotesque/Instrument Sans as data for `ImageResponse` (check how `app/layout.tsx` loads them; `next/font` output isn't directly reusable here — fetch the TTFs at build/request per current Next docs). |
| `components/ds/poster.tsx` | Reference only — mine it for layout/typography decisions; do not refactor it in this ticket. |

## Constraints

- No live data in the card (stock counts change; OG caches are sticky). `ogCard.badge` is frozen copy from publish time — that's why it's in the theme, not computed.
- Hero image inclusion is optional scope: only if `theme.hero` crop can be composited without blowing the size/latency budget (< 1 s render); otherwise ship type-only and note it for Phase 3.

## Contract

- **Consumes:** `drops.theme` (00 migration; manually-inserted themed row for dev until A3), `storefrontThemeSchema` + `oklchString` (00).
- **Provides:** none — leaf ticket.

## Definition of done

- `pnpm build` clean; `/{seller}/{drop}/opengraph-image` returns a PNG for a themed row, an unthemed row, and a nonexistent drop (404).
- Validate the unfurl with an OG debugger or by pasting a tunnel URL into WhatsApp — title/image render.
- Card is legible at thumbnail size (~300 px wide): headline ≥ ~56 px equivalent, contrast via the already-clamped accent.

## Out of scope

Story-format poster export (Phase 3), any changes to `poster.tsx`, buyer-page rendering (F1).
