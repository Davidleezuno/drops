# 00 — Contracts: shared schemas, theme lib, migration, mock endpoint

**Track:** Foundation — lands before every other ticket. Keep it small; no UI, no agent.
**Spec:** `docs/agent-storefront-spec.md` §4 (schemas), §7 (clampTheme), §9 (data). Read those sections before starting.

## Goal

Define every shape the two parallel tracks share, so neither track ever waits on the other: the theme/draft Zod schemas, the deterministic theme utilities, the `drops.theme` column, a fixture draft, and a **mock** `POST /api/draft` that serves the fixture.

## Files

| File | Change |
|---|---|
| `lib/drop-builder.ts` | Add `storefrontThemeSchema`, `dropDraftSchema` (with `paletteCandidates`, `needsInput`), extend `createDropSchema` with `theme: storefrontThemeSchema.nullable()`. Export inferred types `StorefrontTheme`, `DropDraft`. Existing exports unchanged. |
| `lib/theme.ts` | **New.** `clampTheme(theme): StorefrontTheme` and `oklchString(accent): string`. Pure functions, no deps. |
| `lib/types.ts` | Add `theme: StorefrontTheme \| null` to `Drop`. |
| `lib/fixtures/drop-draft-fixture.ts` | **New.** One realistic `DropDraft` (home-bakery: 3 products, `menu` archetype, warm accent, 4 `paletteCandidates`, `needsInput: ['stock', 'window']`), exported as `dropDraftFixture`, validated by `dropDraftSchema.parse` in a test. |
| `app/api/draft/route.ts` | **New, mock.** Reuses the image validation block from `app/api/extract/route.ts` (copy for now; A2 extracts it into a shared helper), then returns `dropDraftFixture` after a ~1.5 s artificial delay. Mark clearly: `// MOCK — replaced by ticket A2.` |
| `supabase/migrations/<ts>_storefront_theme.sql` | `alter table drops add column theme jsonb;` Follow naming of existing migrations in `supabase/migrations/`. |

## Contract details

- Schema field shapes: copy **exactly** from spec §4.1/§4.2 — bounds included (accent `l ∈ [0.45, 0.75]`, `c ∈ [0.05, 0.25]`, string maxes, `paletteCandidates` min 3 max 5). These bounds are load-bearing for both tracks.
- `clampTheme` (spec §7): snap accent `l`/`c` into schema bounds; darken `l` until accent-on-background contrast ≥ 4.5:1 (WCAG relative-luminance math over the OKLCH→sRGB conversion; implement the conversion in-file or via a tiny dep — prefer in-file, it's ~30 lines); sanitize `voice`/`ogCard` strings (strip control chars, collapse whitespace); clamp `hero.crop` into `[0,1]` else set `hero.source = 'none'`. Idempotent: `clampTheme(clampTheme(t))` deep-equals `clampTheme(t)`.
- `oklchString({l, c, h})` → `"oklch(0.62 0.14 55)"` (3 significant decimals max).
- The mock route's request/response contract **is** the `/api/draft` contract: multipart `images` field(s), ≤5 files, ≤4 MB combined, image MIME only; success `200` with `DropDraft` JSON; failure `{ error: string }` with the same status codes/messages `/api/extract` uses today.

## Definition of done

- `pnpm tsc --noEmit` clean.
- Unit tests (colocate as `lib/theme.test.ts` etc., matching whatever test setup exists — if none exists, add vitest minimally): schema parse of fixture; `clampTheme` idempotence; contrast property test — for a sweep of hues `h ∈ {0, 15, …, 345}` with out-of-band `l`/`c`, every clamped accent passes 4.5:1.
- `curl -F images=@docs/test-images/<any> localhost:3000/api/draft` returns the fixture as valid `DropDraft` JSON.
- Migration applied to the dev database; `theme` column exists, existing rows have `null`.
- No behavior change anywhere else: `/api/extract`, builder UI, buyer page all untouched.

## Out of scope

Agent code, real palette proposals, any rendering of the theme, `/api/drops` changes.
