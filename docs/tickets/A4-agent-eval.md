# A4 — Scripted agent eval

**Track:** Agent. **Depends on:** A1 (imports the factory directly; does not need A2).
**Spec:** `docs/agent-storefront-spec.md` §11 (agent eval), §12 (convergence risk).

## Goal

A repeatable, human-readable eval script — not CI-blocking — that runs the draft agent against the fixture images in `docs/test-images/` and reports quality, so prompt/model changes have a measuring stick.

## Files

| File | Change |
|---|---|
| `scripts/eval-draft-agent.ts` | **New.** For each case: build `createDropDraftAgent`, generate, then check: output parses (`dropDraftSchema`); products match the case's ground truth (name + price, order-insensitive); `vertical` matches expected; `theme.accent` deep-equals one of `paletteCandidates`; `needsInput` ⊇ expected fields for image sets that omit stock/window. Print a per-case pass/fail table + wall-clock per draft. |
| `scripts/eval-cases.ts` | **New.** Ground-truth table: `{ images: string[], products: {name, price}[], vertical, expectedNeedsInput }` per case. Build it by inspecting `docs/test-images/` — encode what is actually in each image, don't guess. |

## Convergence check

Across all cases, compute pairwise hue distance between chosen accents. If two different sellers' accents land within Δh < 20° and ΔL < 0.05, print a `CONVERGENCE WARNING` (spec §12: generic-AI-taste drift). Warning, not failure.

## Definition of done

- `pnpm tsx scripts/eval-draft-agent.ts` runs all cases against live models (requires `AI_GATEWAY_API_KEY` or equivalent env already used by `/api/extract`), prints the table, exits non-zero only on schema-invalid output (quality misses are reported, not fatal).
- README note at top of the script: how to run, expected cost/duration, how to add a case.
- At least 3 cases spanning 2 verticals; add fixture images to `docs/test-images/` if the current set is too thin (source them yourself — e.g. photograph-style mock menus — and note provenance).

## Out of scope

CI wiring, latency SLO enforcement, prompt tuning beyond what the eval reveals as broken.
