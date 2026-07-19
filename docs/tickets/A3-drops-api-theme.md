# A3 — Persist theme on publish (`POST /api/drops`)

**Track:** Agent. **Depends on:** 00 only (parallel with A1/A2).
**Spec:** `docs/agent-storefront-spec.md` §6.2, §7, §9.

## Goal

`POST /api/drops` accepts the optional `theme` field (already present in `createDropSchema` since ticket 00) and persists it to `drops.theme`. Everything else about publish is untouched — same validation, same DB logic, same response.

## Files

| File | Change |
|---|---|
| `app/api/drops/route.ts` | Where the parsed `createDropSchema` input is mapped to the insert: run `clampTheme` on `input.theme` when non-null (never trust the client round-trip — spec §7), include `theme` in the drops insert. No other logic changes. |
| `lib/db.ts` / insert path | Only if the insert enumerates columns explicitly — add `theme`. Inspect before assuming. |

## Contract

- **Consumes:** `createDropSchema` + `clampTheme` (00); `drops.theme` column (00 migration).
- **Provides (to F2):** publishing with `theme` persists it; publishing without it (or `theme: null`) behaves exactly as today. Response shape unchanged.
- **Provides (to F1/F3):** published drops carry a clamped, schema-valid theme in `drops.theme` — renderers may trust it after a parse.

## Definition of done

- `pnpm tsc --noEmit` clean.
- Publish via curl with a valid theme → row has the theme; with an out-of-band accent (e.g. `l: 0.95`) → stored value is clamped; with no theme → `null`, and the full existing publish flow (builder UI end-to-end) is regression-clean.
- Existing `/api/drops` tests (if any) still pass; add the three cases above.

## Out of scope

Reading/rendering the theme (F1/F3), the draft endpoint (A2), any UI.
