# Spec: Drop Builder Agent + Agent-Designed Storefronts

**Status:** Draft for build · July 2026
**Depends on:** `ai@6.0.230` (already installed), existing builder flow in `app/new/`, Vercel AI Gateway (already in use by `/api/extract`)

---

## 1. Summary

Two changes, shipped as one refactor:

1. **Coordinator agent.** Replace the single-shot `generateText` call in `/api/extract` with a `ToolLoopAgent` that inspects uploaded images and produces one structured **DropDraft** — products *and* a proposed storefront design — rendered in the existing editable form UI, never as conversational text.
2. **Designed storefronts.** Introduce a typed `StorefrontTheme` (accent, layout archetype, hero, voice, OG card) that the agent proposes, the seller reviews/overrides in the draft UI, and the buyer page renders via CSS-variable overrides and an archetype switch.

The conceptual loop:

```
uploaded images → agent (tools) → DropDraft → seller edits/settings → publish approval → createDrop → links
```

**Invariant carried over from the payment spec:** the agent proposes, deterministic code owns correctness. The agent never publishes, never touches money/stock, and its design output is clamped by server-side validation (contrast, schema bounds) before it ever reaches a buyer.

## 2. Goals / non-goals

**Goals**

- One agent call yields a complete draft: products + theme + copy, editable in the current visual UI (`app/new/drop-builder.tsx`).
- Storefronts that visibly fit what's being sold (color, layout archetype, hero, voice) with **zero required seller configuration** — the Linktree/Luma model: a small set of hand-designed presets + one accent, agent-proposed defaults, seller taps to override. Not the Shopify model (theme library + section settings), which is the permanent-store world the thesis rejects.
- Per-drop OG/share card generated from the theme — the WhatsApp link preview *is* the storefront.
- Publish remains an explicit seller action through the existing `POST /api/drops` validation and DB logic.

**Non-goals**

- No theme picker, no store builder, no seller-facing design config beyond accept/override (thesis guardrail, `future-ideas.md`).
- No agent-generated JSX/CSS or free-form layout DSL. Customization = widening a schema over hand-built components.
- No chat UI. The agent is invisible; its output is a form.
- No changes to claim engine, checkout, webhooks, or stock math.

## 3. Current state (what we're refactoring)

| Piece | Today |
|---|---|
| `POST /api/extract` | Single `generateText` + `Output.object(extractedMenuSchema)` → products only |
| `app/new/drop-builder.tsx` | Client wizard: upload → editable product cards → consolidated settings (stock, window, fulfilment, fee, pickup note) → publish |
| `POST /api/product-shots` | Explicit per-product image enhancement (stays as-is, seller-triggered) |
| `POST /api/drops` | `createDropSchema` validation → DB insert → links |
| Buyer page | `app/[seller]/[drop]/drop-storefront.tsx` + `components/ds/*`, all colors from CSS variables in `app/globals.css` (`--flame`, `--flame-soft`, `--live`, …) |

The client flow (steps 1–2, upload → review → publish) is kept exactly; only the AI call behind step 1→2 changes shape, and the review step gains a "Storefront" card.

## 4. Schemas (`lib/drop-builder.ts`)

### 4.1 `storefrontThemeSchema`

```ts
export const storefrontThemeSchema = z.object({
  // OKLCH keeps hue manipulation and clamping deterministic.
  accent: z.object({
    l: z.number().min(0.45).max(0.75),  // legibility band on warm-white court
    c: z.number().min(0.05).max(0.25),
    h: z.number().min(0).max(360),
  }),
  archetype: z.enum(['menu', 'grid', 'spotlight', 'tiers']),
  vertical: z.enum(['fnb', 'fashion', 'beauty', 'collectibles', 'services', 'other']),
  hero: z.object({
    source: z.enum(['upload-crop', 'none']),
    sourceImageIndex: z.number().int().min(0).max(4).nullable(),
    // Normalized 0–1 crop rect; renderer maps to object-position/aspect.
    crop: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).nullable(),
  }),
  voice: z.object({
    dropTitle: z.string().trim().min(1).max(60),      // "Tonight's bake" not "Product listing"
    sellerNote: z.string().trim().max(140).nullable(), // one human line, seller-editable
    tone: z.enum(['warm', 'hype', 'minimal']),
  }),
  ogCard: z.object({
    headline: z.string().trim().min(1).max(48),
    badge: z.string().trim().max(24).nullable(),       // "12 only" / "closes 9pm"
  }),
})
export type StorefrontTheme = z.infer<typeof storefrontThemeSchema>
```

Notes:

- The accent `l`/`c` mins/maxes are the first guardrail; a server-side `clampTheme()` (§7) is the second.
- `archetype` and `vertical` are separate: vertical is what the agent *saw*; archetype is the layout decision. Decoupling lets us route new verticals onto existing archetypes without schema churn.
- Widening this schema over time (density, radius, type scale) is the roadmap for "more customization" — never generated code.

### 4.2 `dropDraftSchema` (agent output)

```ts
export const dropDraftSchema = z.object({
  products: extractedMenuSchema.shape.products, // unchanged
  theme: storefrontThemeSchema,
  // All candidates from proposePalette (theme.accent is the agent's pick from
  // these) — rendered as the seller's swatch row in the review UI.
  paletteCandidates: z.array(storefrontThemeSchema.shape.accent).min(3).max(5),
  // Blocking questions the agent could not resolve from images alone,
  // surfaced as highlighted fields in the form — not as chat.
  needsInput: z.array(z.enum(['stock', 'window', 'deliveryFee', 'pickup'])),
})
export type DropDraft = z.infer<typeof dropDraftSchema>
```

### 4.3 `createDropSchema` (extended)

Add one field; everything else unchanged:

```ts
theme: storefrontThemeSchema.nullable(), // null = current default look
```

## 5. The agent (`lib/agents/drop-draft-agent.ts`)

New directory `lib/agents/` for agent + tool definitions.

```ts
import { ToolLoopAgent, Output, stepCountIs, tool } from 'ai'
import { z } from 'zod'
import { dropDraftSchema } from '@/lib/drop-builder'
import { proposePalette } from '@/lib/agents/tools/propose-palette'

const model = process.env.DRAFT_MODEL || 'anthropic/claude-sonnet-5' // via AI Gateway, like /api/extract

export const dropDraftAgent = new ToolLoopAgent({
  model,
  instructions: `You are the drop builder for Drops, a storefront for people with a
following. From the seller's uploaded images (menu cards, product photos, live-sale
prep sheets) you produce ONE structured draft: the products for sale and a storefront
design that fits the seller.

Rules:
- Extract every distinct purchasable item with its price. Variants of one item share a name.
- Classify the vertical from what you see; choose the archetype that best sells it:
  fnb → menu, photo-forward products → grid, one hero item → spotlight, group-buy → tiers.
  This is a default the seller can change — pick the strongest fit, not a safe middle.
- Call proposePalette to get candidate accents designed for this seller's vibe, then
  choose the primary accent from those candidates. Return ALL candidates in
  paletteCandidates so the seller can pick a different one.
- Write dropTitle/sellerNote/ogCard in the seller's own register — mirror the language
  and tone of any text visible in the images (including Singlish). Short. No emoji spam.
- If stock counts, a selling window, or delivery details are not visible in the images,
  list them in needsInput. Do not guess them.
- You produce a draft only. You never publish.`,
  tools: {
    proposePalette: tool({
      description:
        "Propose 3-5 candidate accent colors (OKLCH) designed for this seller's vibe — what they sell, who they sell to, the mood of their imagery. Each candidate is returned pre-clamped for legibility on the storefront background.",
      inputSchema: z.object({
        vibe: z.string().max(200), // coordinator's read of the seller, e.g. "late-night home bakery, handwritten menu, cosy"
      }),
      execute: async ({ vibe }) => proposePalette(vibe, images), // sub-call to DESIGN_MODEL, see below
    }),
  },
  stopWhen: stepCountIs(8),
  output: Output.object({ schema: dropDraftSchema, name: 'drop_draft' }),
})
```

Design decisions:

- **Vision via prompt, not a tool.** The model is multimodal; images go in as `image` content parts on `agent.generate({ messages })`, same encoding `/api/extract` uses today.
- **`proposePalette` is a specialist sub-call, not pixel math.** Its `execute` (`lib/agents/tools/propose-palette.ts`) runs `generateObject` against `DESIGN_MODEL` (env-configured, swappable independently of the coordinator) with a design-specialist prompt, the coordinator's one-line `vibe` read, and the seller's images — passed purely as *reference for what this store is selling*, not as a color source. The palette is designed for the vibe, not extracted from the photos — brown cookies can get a pastel-cottagecore accent. The sub-call prompt still notes that the accent will share the page with these photos, so proposals should sit well beside them.
  - Every candidate is passed through `clampTheme`'s accent clamp before being returned to the coordinator, so the agent only ever chooses among legible options.
- **`stopWhen: stepCountIs(8)`** — expected trace is 1 palette call + final structured output; 8 is headroom, not a loop budget.
- **`needsInput` replaces conversational clarification.** The old plan's `askUserQuestion` tool becomes data: the form highlights the fields the agent flagged. One consolidated settings section (stock, window, pickup, delivery) — no back-and-forth.
- Per-request tool state (the uploaded images the closure needs) is handled by constructing the agent per request via a small factory `createDropDraftAgent(images)` — the module-level example above is illustrative; the factory is the implementation (§6.1).

## 6. API changes

### 6.1 `POST /api/draft` (new; supersedes `/api/extract`)

Same request contract as `/api/extract` today (multipart, ≤5 images, ≤4 MB total — reuse its validation block verbatim). Response is `DropDraft`.

```ts
// app/api/draft/route.ts (sketch)
const images = await readValidatedImages(request)         // extracted from /api/extract
const agent = createDropDraftAgent(images)                // binds extractPalette to these images
const { output } = await agent.generate({
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Create the drop draft from these images.' },
      ...images.map((img) => ({ type: 'image' as const, image: img.bytes, mediaType: img.type })),
    ],
  }],
})
const draft = dropDraftSchema.parse(output)
draft.theme = clampTheme(draft.theme)                     // §7 — deterministic, server-side
return NextResponse.json(draft)
```

- `maxDuration = 60` (was 30; the loop can take 2–3 generations).
- Keep the primary/fallback model env pattern from `/api/extract` (`DRAFT_MODEL`, `DRAFT_FALLBACK_MODEL`): on primary failure, rebuild the agent with the fallback model and retry once.
- `/api/extract` stays until the client is migrated, then is deleted in the same PR that flips the client.

### 6.2 `POST /api/drops` (extended)

- Accept optional `theme` per §4.3; run `clampTheme()` again before insert (never trust the client round-trip).
- Persist to `drops.theme`.

### 6.3 `GET /[seller]/[drop]/opengraph-image` (new)

Next.js `opengraph-image.tsx` under `app/[seller]/[drop]/` using `ImageResponse`: seller name in the display face, `ogCard.headline`, `ogCard.badge`, hero crop if present, accent as the single color moment. Reads the same `drops.theme` row — the card is a view of the theme, not a second design.

## 7. Deterministic guardrails (`lib/theme.ts`)

```
clampTheme(theme):
  - snap accent l/c into the legibility band; verify ≥ 4.5:1 contrast for
    accent-on-court text usage via APCA/WCAG math; if unreachable at that hue,
    darken l until it passes (never re-ask the model)
  - strip control chars / collapse whitespace in all voice + ogCard strings
  - clamp crop rect into [0,1] and to ≥ 16:7 usable aspect, else hero.source = 'none'
```

**Trust chrome is out of scope for theming, permanently.** The claim button, countdown, stock counter, price rows (`Price`, `StockBadge`, `Countdown`, `BuyFlow`) keep system tokens (`--flame` for the live/paid moments, ink pills, mono numerals) regardless of theme. The theme's accent applies only to identity surfaces: header eyebrow, hero treatment, section accents, OG card. A buyer must be able to recognize a Drops checkout on any seller's page. Enforced structurally: trust components never read the theme CSS variables (§8.1).

## 8. Rendering

### 8.1 Theme → CSS variables

`app/[seller]/[drop]/page.tsx` wraps the storefront in a scope div when `drop.theme` exists:

```tsx
<div style={{
  '--seller-accent': oklchString(theme.accent),
  '--seller-accent-soft': oklchString({ ...theme.accent, l: 0.95, c: theme.accent.c * 0.25 }),
} as React.CSSProperties}>
```

- Two **new** variables, registered in `globals.css` alongside `--flame`. Identity components (`DropHeader`, hero, archetype sections, poster) use `--seller-accent` with `var(--seller-accent, var(--flame))` fallback; trust components keep using `--flame`/ink and are never pointed at the new variables. `theme = null` renders today's look pixel-for-pixel.

### 8.2 Archetypes

`components/ds/archetypes/{menu,grid,spotlight,tiers}.tsx`, selected by a switch in `drop-storefront.tsx`. Each is a hand-designed arrangement of the *existing* ds components (`ProductRow`, `StockBadge`, `BuyFlow`, …):

- **menu** — current list layout + optional hero band; F&B default. (Ship first; it's a refactor of what exists.)
- **grid** — 2-col photo-forward cards; uses product-shot images when the seller has enhanced them.
- **spotlight** — one hero product full-bleed, rest in a compact list below.
- **tiers** — spotlight variant with a claims-progress bar (depends on the group-buy mechanics in `future-ideas.md`; schema value reserved, component ships in Phase 3, agent instructed not to select it until then — falls back to `spotlight`).

### 8.3 Draft review UI (`app/new/drop-builder.tsx`)

The review phase gains one **Storefront card** between product cards and settings:

- Live mini-preview: render the real archetype component with the proposed theme at ~65% scale (same React tree — no separate preview implementation).
- Controls, in full: **accent swatch row** (`paletteCandidates` from the draft; tap to switch — the preview re-renders live), **archetype chips** (the shipped presets, agent's pick pre-selected; tapping another re-renders the preview — this is "pick a preset," Linktree-style, not a builder), **Shuffle** (re-POST `/api/draft` with a `nudge: 'bolder' | 'calmer'` hint appended to the message), editable `dropTitle` + `sellerNote` text inputs. Nothing else.
- Fields listed in `needsInput` get the highlight treatment in the consolidated settings section.
- Image enhancement (`/api/product-shots`) stays exactly where it is: explicit per-product seller action.
- Publish button unchanged: summary → explicit approval → `POST /api/drops` with `theme` included.

## 9. Data

Migration `xxxx_storefront_theme.sql`:

```sql
alter table drops add column theme jsonb;
```

- No new tables. Theme is denormalized per drop (a drop's look is frozen at publish; a seller's *next* drop can differ).
- **Seller prior (Phase 3):** `select theme from drops where seller_slug = $1 order by created_at desc limit 1`, passed into the agent prompt as "the seller's previous look" so identity accretes across drops by default.

## 10. Phases

| Phase | Scope | Proof |
|---|---|---|
| **1 — Agent refactor** | `lib/agents/` + `/api/draft` (products + `needsInput` only, `theme` returned but unused), client flipped to `/api/draft`, `/api/extract` deleted | Existing flow works end-to-end, byte-identical UI; draft latency < 15 s p50 |
| **2 — Themed storefront** | `theme` column, `clampTheme`, CSS-variable scope, Storefront card w/ preview + swatches + shuffle, `menu` + `grid` archetypes, OG image route | Two demo sellers (bake menu vs. sneaker photos) produce visibly different, on-system storefronts; link preview shows the designed card |
| **3 — Depth** | `spotlight` + `tiers` archetypes, seller-prior continuity, story-format poster export | Returning seller's second drop defaults to their look |

## 11. Testing

- **Unit:** `clampTheme` (contrast property test across hue sweep — every clamped accent passes 4.5:1), `dropDraftSchema`/`createDropSchema` parsing.
- **Agent eval (scripted, not CI-blocking):** run `/api/draft` against the fixture set; assert products match known ground truth, `vertical` classification correct, chosen accent ∈ palette candidates, `needsInput` includes `stock`/`window` for image sets that omit them.
- **Integration:** publish with and without `theme`; `theme = null` storefront snapshot-matches current rendering; trust components' computed styles identical across themed/unthemed pages.
- **Manual runbook addition:** two-seller demo from Phase 2 proof.

## 12. Risks

- **Draft latency** (loop = 2–3 generations vs. 1 today). Mitigation: single palette tool keeps steps low; show the existing extraction skeleton state; fallback model on failure. If p50 breaches ~15 s, drop to `toolChoice: { type: 'tool', toolName: 'proposePalette' }` on step 1 to remove one deliberation round (the `DESIGN_MODEL` sub-call also adds a generation — pick a fast model there).
- **Ugly-but-valid themes.** Clamping guarantees legible, not beautiful. Mitigation: narrow schema bands, candidate swatches from a design-specialist model, shuffle button, and the seller's eyes on a real preview before publish.
- **AI-taste convergence.** Vibe-proposed palettes from LLMs drift toward the same generic hues (teal/coral). Mitigation: the seller's images ride along in the `proposePalette` sub-call as reference for what's being sold, the design prompt demands differentiation across the 3–5 candidates, and `DESIGN_MODEL` is independently swappable when a more tasteful option ships. Watch this in the agent eval (§11) — if two fixture sellers converge on near-identical accents, tighten the prompt.
- **Scope creep toward store builder.** The schema is the fence: any proposed customization that can't be expressed as a schema field over hand-built components is out (see non-goals).
