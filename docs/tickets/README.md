# Tickets: Drop Builder Agent + Designed Storefronts

Source spec: [`../agent-storefront-spec.md`](../agent-storefront-spec.md). Every ticket is written as a standalone handoff — an implementer should be able to work from the ticket + the spec alone.

## Tracks and order

```
                      ┌──────────────── Agent track (backend) ───────────────┐
                      │  A1 agent + tool   →   A2 /api/draft   →  A4 eval    │
00-contracts  ──┬──►  │                        A3 /api/drops theme           │
 (land FIRST)   │     └──────────────────────────────────────────────────────┘
                │     ┌──────────────── Frontend track ─────────────────────┐
                └──►  │  F1 theme rendering   F2 builder UI   F3 OG image   │
                      └──────────────────────────────────────────────────────┘
                                            ▼
                                   Z1 integration + cleanup
```

- **00 lands first, alone.** It is small and defines every shared type, the DB column, and a mock `/api/draft` that serves a fixture. Nothing else starts until it merges.
- **After 00, the two tracks are fully parallel.** The frontend track develops against the mock endpoint and fixture; the agent track replaces the mock's internals without changing its contract.
- Within the agent track: A1 → A2 are sequential; A3 and A4 are independent of each other.
- Within the frontend track: F1, F2, F3 are mutually independent (F2 renders F1's archetypes in its preview — until F1 lands, preview the existing storefront layout; the integration is a one-line component swap in Z1 if needed).
- **Z1 requires everything** and is the only ticket allowed to delete `/api/extract`.

## The contracts (summary — authoritative versions live in code after ticket 00)

| Contract | Shape | Producer | Consumers |
|---|---|---|---|
| `StorefrontTheme` | `storefrontThemeSchema` in `lib/drop-builder.ts` (spec §4.1) | 00 | A1, A3, F1, F2, F3 |
| `DropDraft` | `dropDraftSchema` in `lib/drop-builder.ts` (spec §4.2 + `paletteCandidates`) | 00 | A1, A2, F2 |
| `POST /api/draft` | multipart images (same limits as today's `/api/extract`) → `DropDraft` JSON; errors `{ error: string }` with 4xx/5xx | 00 (mock) → A2 (real) | F2 |
| `POST /api/drops` | existing `createDropSchema` + optional `theme` | A3 | F2 |
| `drops.theme` column | `jsonb`, null = default look | 00 (migration) | A3 writes, F1/F3 read |
| `clampTheme` / `oklchString` | `lib/theme.ts` | 00 | A1, A2, A3, F1 |
| Fixture draft | `lib/fixtures/drop-draft-fixture.ts` | 00 | F2 dev, A4 eval baseline, tests |

**Rules for all tickets**

- Do not change a contract shape inside a track ticket. If a shape must change, that change goes through a `00`-style PR both tracks review.
- `theme = null` must always render today's storefront pixel-for-pixel — every ticket preserves this.
- Trust chrome (claim button, countdown, stock counter, prices — `BuyFlow`, `Countdown`, `StockBadge`, `Price`) never reads theme values. Spec §7.
- The agent never publishes; publish stays an explicit seller action through `/api/drops`.

## Index

| Ticket | Title | Track |
|---|---|---|
| [00-contracts.md](00-contracts.md) | Shared schemas, theme lib, migration, mock endpoint | Foundation |
| [A1-drop-draft-agent.md](A1-drop-draft-agent.md) | `ToolLoopAgent` factory + `proposePalette` tool | Agent |
| [A2-api-draft-route.md](A2-api-draft-route.md) | Real `POST /api/draft` | Agent |
| [A3-drops-api-theme.md](A3-drops-api-theme.md) | Persist theme on publish | Agent |
| [A4-agent-eval.md](A4-agent-eval.md) | Scripted draft eval | Agent |
| [F1-theme-rendering.md](F1-theme-rendering.md) | Buyer page theming + archetypes | Frontend |
| [F2-builder-storefront-card.md](F2-builder-storefront-card.md) | Builder review UI: Storefront card | Frontend |
| [F3-og-image.md](F3-og-image.md) | Per-drop OG image | Frontend |
| [Z1-integration.md](Z1-integration.md) | Wire-up, `/api/extract` removal, E2E verify | Both |
