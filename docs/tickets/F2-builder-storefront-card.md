# F2 — Builder review UI: Storefront card + `/api/draft` flip

**Track:** Frontend. **Depends on:** 00 (develops against the mock `/api/draft`). Independent of A1–A3, F1, F3.
**Spec:** `docs/agent-storefront-spec.md` §8.3. The eight flow constraints in §1/§2 are non-negotiable: visual form kept, draft-not-chat, one consolidated settings section, product-shots stays an explicit action, summary + explicit approval, publish only via `/api/drops`.

## Goal

`app/new/drop-builder.tsx` consumes `DropDraft` instead of the products-only extract response, and the review phase gains one **Storefront card** between the product cards and the settings section. The wizard's phase structure, product cards, settings, and publish flow are otherwise unchanged.

## Files

| File | Change |
|---|---|
| `app/new/drop-builder.tsx` | (1) Point the extract call (`fetch('/api/extract')`, ~line 438) at `/api/draft`; response is `DropDraft` — products populate the existing product cards exactly as before; hold `theme` + `paletteCandidates` in new state. (2) Insert the Storefront card (below). (3) Fields named in `needsInput` get a highlight treatment in the existing consolidated settings section (reuse the current error/attention styling — do not invent a new one). (4) Include `theme` in the publish `POST /api/drops` body (~line 508); until A3 lands the server ignores unknown… **no** — `createDropSchema` already accepts `theme` since 00, so send it unconditionally. |
| `components/ds/storefront-card.tsx` | **New.** The review card, four elements only: **live mini-preview**, **accent swatch row**, **archetype chips**, **Shuffle**. Plus inline text inputs for `voice.dropTitle` and `voice.sellerNote`. |

## Storefront card behavior (complete list — nothing else)

- **Preview:** render the drop as the buyer will see it at ~65 % scale inside the card. If F1's archetype components exist in the branch, use them via the same scope-div CSS-variable pattern; if F1 hasn't landed, render the existing `drop-storefront` layout with the accent variables applied and leave a `// TODO(Z1): swap to archetype components` — the swap is one import. Preview re-renders live on every control change.
- **Swatch row:** one swatch per `paletteCandidates` entry, `theme.accent` pre-selected; tap switches `theme.accent`.
- **Archetype chips:** one chip per shipped archetype (`menu`, `grid` for now — drive from a local const, not the schema enum, so unbuilt archetypes never show), agent's pick pre-selected; tap switches `theme.archetype`.
- **Shuffle:** two options, `Bolder` / `Calmer` → re-POST `/api/draft` with the original images plus `nudge` field; replace `theme` + `paletteCandidates` from the response, **never** touch the seller's product edits or settings. Disable while in flight; reuse the existing extracting-skeleton affordance.
- **Voice inputs:** `dropTitle` (60 chars) and `sellerNote` (140 chars) as plain inputs, seeded from the draft.

## Contract

- **Consumes:** `POST /api/draft` (00 mock now, A2 real later — the flip must require zero client changes); `DropDraft` type (00); `POST /api/drops` with `theme`. The schema accepts `theme` since ticket 00, so send it unconditionally — before A3 merges the route simply doesn't persist it, which is harmless. Verify once against `app/api/drops/route.ts` that the parsed field is ignored rather than rejected.
- **Provides:** none — leaf ticket.

## Definition of done

- `pnpm tsc --noEmit` clean; `pnpm build` clean.
- Full wizard run against the mock endpoint: upload → draft renders in product cards + Storefront card → swatch/chip/shuffle/voice all update the preview → `needsInput` fields highlighted → summary → publish succeeds (theme in the request body — assert via network tab or a route log).
- Product-shot enhancement still works per product, unchanged.
- The wizard with a hand-rolled products-only path is **not** kept — `/api/draft` is the only path; but graceful failure: if the endpoint 5xxs twice, surface the existing error affordance with retry.
- Mobile (375 px) pass over the review phase: card is usable, preview legible.

## Out of scope

Deleting `/api/extract` (Z1), OG image (F3), archetype component implementations (F1), any server code.
