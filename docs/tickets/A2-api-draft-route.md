# A2 — Real `POST /api/draft`

**Track:** Agent. **Depends on:** 00, A1.
**Spec:** `docs/agent-storefront-spec.md` §6.1.

## Goal

Replace the mock internals of `app/api/draft/route.ts` (ticket 00) with the real agent call — **without changing the route's request/response contract in any way**. The frontend track is building against that contract in parallel; if F2 lands first, nothing breaks, and vice versa.

## Files

| File | Change |
|---|---|
| `lib/draft-images.ts` | **New.** `readValidatedImages(request): Promise<DraftImage[] \| { error, status }>` — extract the multipart validation block currently duplicated in `app/api/extract/route.ts` and the mock route (count ≤ 5, per-file ≤ 4 MB, combined ≤ 4 MB, image MIME, legacy single-`image` field support). Refactor `/api/extract` to use it too, so behavior can't drift while both routes coexist. |
| `app/api/draft/route.ts` | Replace mock body: `readValidatedImages` → `createDropDraftAgent(images)` → `agent.generate({ messages })` with images as content parts (spec §6.1 sketch) → `dropDraftSchema.parse(output)` → `clampTheme` on `theme` **and** every `paletteCandidates` entry → JSON. `maxDuration = 60`, `runtime = 'nodejs'`. Remove the `MOCK` comment. |

## Behavior

- **Fallback:** on primary-model failure (throw or unparseable output), rebuild the agent with `DRAFT_FALLBACK_MODEL` and retry once; then 502 `{ error }` with a seller-readable message (match the tone of `/api/extract`'s current error strings).
- **Nudge (for F2's Shuffle):** accept optional multipart field `nudge` with values `bolder | calmer`; when present, append one sentence to the user message ("The seller wants a bolder/calmer look — re-propose the design."). Unknown values ignored. This is additive to the 00 contract; document it in a comment at the top of the route.
- Server-side `clampTheme` runs here even though `proposePalette` clamps too — the route trusts nothing (spec §7).

## Contract

- **Consumes:** `createDropDraftAgent` (A1), `dropDraftSchema` + `clampTheme` (00).
- **Provides:** identical contract to the 00 mock, plus optional `nudge`. F2 must require no changes when this lands.
- `/api/extract` remains routable until Z1 deletes it.

## Definition of done

- `pnpm tsc --noEmit` clean.
- `curl -F images=@docs/test-images/<menu-image> localhost:3000/api/draft` returns a schema-valid `DropDraft` with real extracted products in < 20 s; repeat with `-F nudge=bolder` and observe a different accent/archetype tendency.
- Validation-failure cases (no image, oversized, wrong MIME, 6 images) return the same status + `{ error }` shapes as the 00 mock.
- `/api/extract` still returns its current shape (regression: run the existing builder UI once end-to-end).
- Route-level test with A1's mocked agent: happy path, fallback path (primary throws → fallback output returned), double-failure → 502.

## Out of scope

Deleting `/api/extract` (Z1), client changes (F2), `/api/drops` (A3).
