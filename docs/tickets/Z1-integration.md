# Z1 — Integration, `/api/extract` removal, end-to-end verify

**Track:** Both — the only ticket that requires every other ticket merged. Sequential, run by one implementer.
**Spec:** `docs/agent-storefront-spec.md` §10 (Phase 1–2 proofs), §11.

## Goal

Close the seams the parallel tracks left open, delete the superseded path, and prove the whole flow — upload → agent draft → seller edit → publish → themed buyer page → OG unfurl — against the real stack.

## Steps

1. **Preview swap (if pending).** If F2 shipped its preview against the pre-archetype layout (`// TODO(Z1)` marker in `components/ds/storefront-card.tsx`), swap it to F1's archetype components. One import + switch; preview must now match the buyer page exactly.
2. **Delete `/api/extract`.** Remove `app/api/extract/route.ts` and any remaining references (`grep -r "api/extract"` across `app/ lib/ docs/ scripts/`). The shared image validation lives in `lib/draft-images.ts` (A2) — confirm `/api/draft` is its only consumer left.
3. **Env audit.** `DRAFT_MODEL`, `DRAFT_FALLBACK_MODEL`, `DESIGN_MODEL` documented in `.env.example` (create if absent) and set in Vercel envs. Remove `EXTRACT_MODEL` / `EXTRACT_FALLBACK_MODEL` references.
4. **Mock retirement check.** `app/api/draft/route.ts` contains no fixture/mock remnants; `lib/fixtures/drop-draft-fixture.ts` stays (tests + eval use it) but nothing in `app/` imports it.
5. **End-to-end run (the real proof, spec §10 Phase 2):** with live models, run the two-seller demo — a bake-menu image set and a product-photo set. Assert:
   - drafts land < 20 s with correct products; the two sellers get visibly different accents + archetypes;
   - swatch/chip/shuffle work against the real endpoint;
   - publish persists theme; buyer page renders it; trust chrome identical across both sellers' pages;
   - claim → pay (sandbox) → stock tick works unchanged on a themed page — **the money path is the regression that matters most**;
   - OG image renders for both drops.
6. **Null-theme parity.** Publish one drop with theme stripped (or a pre-migration row): buyer page pixel-matches `main` (screenshot diff, mobile + desktop).
7. **Docs.** Update `docs/ticket-07-demo-runbook.md` (or successor) with the two-seller demo steps; mark spec §10 Phase 1–2 done.

## Definition of done

- `pnpm tsc --noEmit`, `pnpm build`, full test suite clean.
- Steps 5–6 evidence captured (screenshots of both themed storefronts + one unfurl) and linked in the PR.
- `git grep "api/extract"` returns only historical docs (`docs-archived/`, git history).

## Out of scope

Phase 3 (spotlight/tiers archetypes, seller-prior continuity, poster export), latency tuning beyond the < 20 s check, prompt iteration (A4's eval owns that).
