# A1 — Drop draft agent: `ToolLoopAgent` factory + `proposePalette` tool

**Track:** Agent. **Depends on:** 00. **Blocks:** A2.
**Spec:** `docs/agent-storefront-spec.md` §5 — the agent definition there is authoritative, including the full instructions block. Read it first.

## Goal

A pure library layer (no route, no UI): `createDropDraftAgent(images)` returning a configured `ToolLoopAgent` whose `generate` call yields a `DropDraft`, plus the `proposePalette` tool that sub-calls a design-specialist model.

## Before writing code

The AI SDK is `ai@6.0.230` with docs bundled at `node_modules/ai/docs/03-agents/` — verify `ToolLoopAgent`, `tool()`, `Output.object`, `stepCountIs` signatures there; do not trust memorized APIs. Model IDs must come from `curl -s https://ai-gateway.vercel.sh/v1/models`, not memory. Follow the model-selection pattern already used in `app/api/extract/route.ts` (Gateway model strings via env with defaults).

## Files

| File | Change |
|---|---|
| `lib/agents/drop-draft-agent.ts` | **New.** `createDropDraftAgent(images: DraftImage[])` — factory per spec §5: `instructions` verbatim from spec, `tools: { proposePalette }` bound to the request's images, `stopWhen: stepCountIs(8)`, `output: Output.object({ schema: dropDraftSchema, name: 'drop_draft' })`. Model from `DRAFT_MODEL` env, default `anthropic/claude-sonnet-5`; accept a model override parameter so A2 can retry with `DRAFT_FALLBACK_MODEL`. |
| `lib/agents/tools/propose-palette.ts` | **New.** `proposePalette(vibe: string, images: DraftImage[])`: one `generateObject` call to `DESIGN_MODEL` env model (default: pick a current fast Gateway model) with a design-specialist prompt. Returns `{ candidates: Accent[] }` (3–5), each passed through the accent clamp from `lib/theme.ts` before returning. |
| `lib/agents/types.ts` | **New.** `DraftImage = { bytes: Uint8Array; mediaType: string }` — the internal currency between route, agent, and tool. |

## Contract

- **Consumes:** `dropDraftSchema`, `storefrontThemeSchema`, `clampTheme` from ticket 00.
- **Provides (to A2):** `createDropDraftAgent(images, { model? })`; calling `agent.generate({ messages })` with the images as `image` content parts resolves with `output` parseable by `dropDraftSchema`.
- Images reach the coordinator as message content parts (same encoding as `app/api/extract/route.ts` today) **and** reach `proposePalette` via factory closure. In the sub-call, images are reference for *what the store sells* — the prompt must say palettes are designed for the vibe, not extracted from photo pixels, and that the accent will share the page with these photos so proposals should sit well beside them (spec §5).
- The design prompt must demand differentiation across the 3–5 candidates (anti-convergence, spec §12).

## Definition of done

- `pnpm tsc --noEmit` clean.
- Unit test with a mocked model (AI SDK's mock provider — see `node_modules/ai/docs/` testing section): factory wires instructions/tools/output; a scripted tool-call round-trip produces a schema-valid `DropDraft`; `proposePalette` clamps an out-of-band candidate returned by the mocked design model.
- One live smoke script (not CI): `pnpm tsx scripts/smoke-draft-agent.ts docs/test-images/<img>` prints a valid `DropDraft` with 3–5 clamped `paletteCandidates` and `theme.accent` ∈ candidates.

## Out of scope

The HTTP route (A2), fallback/retry orchestration (A2), eval harness (A4), any UI.
