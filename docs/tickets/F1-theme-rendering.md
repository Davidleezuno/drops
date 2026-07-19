# F1 — Buyer page theming + archetypes

**Track:** Frontend. **Depends on:** 00 only.
**Spec:** `docs/agent-storefront-spec.md` §8.1, §8.2, §7 (trust chrome). Design language: `docs/future-ideas.md` §"clean court, warm flame" note — read it; new components must match it.

## Goal

The buyer page renders a drop's `theme`: accent via scoped CSS variables, layout via an archetype switch. `theme = null` renders today's page **pixel-for-pixel** — this is the ticket's hardest requirement.

## Files

| File | Change |
|---|---|
| `app/globals.css` | Register `--color-seller-accent: var(--seller-accent)` and `--color-seller-accent-soft: var(--seller-accent-soft)` alongside the existing `--color-flame` entries, with `:root` defaults equal to `--flame`/`--flame-soft` (the fallback IS the current look). |
| `app/[seller]/[drop]/page.tsx` | Parse `drop.theme` with `storefrontThemeSchema.safeParse` (invalid/absent → null). When present, wrap the storefront in a scope div setting `--seller-accent` / `--seller-accent-soft` inline via `oklchString` (spec §8.1 sketch; soft = `{ l: 0.95, c: c*0.25 }`). Pass `theme` down. |
| `app/[seller]/[drop]/drop-storefront.tsx` | Add the archetype switch: `theme?.archetype` selects the layout component; `null` → current layout unchanged. `tiers` and `spotlight` fall back to `menu`/`grid` respectively until built (Phase 3 — leave a `// reserved` case). |
| `components/ds/archetypes/menu.tsx` | **New.** Refactor of the *existing* product-list arrangement + optional hero band when `theme.hero.source === 'upload-crop'` (render crop via `object-position` from the normalized rect). Composes existing ds components only. |
| `components/ds/archetypes/grid.tsx` | **New.** 2-col photo-forward cards using `product.image_url` (product-shots output) with text fallback when images are missing. Composes existing ds components. |
| `components/ds/drop-header.tsx`, hero/identity surfaces | Point *identity* accents at `var(--seller-accent, var(--flame))`. |

## Hard rules

- **Trust chrome never themed:** `BuyFlow`, `Countdown`, `StockBadge`, `Price`, claim/pay buttons keep `--flame`/ink exactly as today. Do not touch those files' colors. Enforced structurally: only identity components may reference `--seller-accent*` (spec §7/§8.1).
- Archetypes are arrangements of existing `components/ds/*` pieces — no new visual vocabulary, no new fonts, radii, or shadows. "One calm list beats a grid of chips."
- Mobile-first: both archetypes verified at 375 px.

## Contract

- **Consumes:** `storefrontThemeSchema`, `oklchString` (00); `drops.theme` (00 migration — until A3 lands, insert a themed row manually/SQL for development, using `lib/fixtures/drop-draft-fixture.ts`'s theme).
- **Provides (to F2):** archetype components importable for the builder preview; the scope-div pattern reusable at preview scale.

## Definition of done

- `pnpm tsc --noEmit` clean; `pnpm build` clean.
- A drop with `theme = null` is visually identical to `main` (screenshot diff at 375 px and desktop — use the browser preview tooling, capture before/after).
- A manually-inserted themed drop shows: accent on identity surfaces, chosen archetype layout, hero crop when set; claim/countdown/stock visually identical to the unthemed page.
- Reduced-motion and dark-court behavior unchanged (no new motion added).

## Out of scope

`spotlight`/`tiers` implementations, OG image (F3), builder UI (F2), any API work.
