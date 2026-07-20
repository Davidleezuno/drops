# Spec: 3D Multiplayer Storefronts

**Status:** Draft for build · July 2026 (hackathon scope — production constraints deliberately relaxed, see §10)
**Builds on:** `docs/agent-storefront-spec.md` (implemented on this branch — agent draft, `StorefrontTheme`, flat archetypes, OG card). Nothing there is scrapped; this spec adds a second renderer of the same theme.

---

## 1. Summary

Buyers land in a small **3D shop built with Three.js** instead of a flat listing page. The shop is a hand-built template, skinned per-seller by the existing agent-designed `StorefrontTheme`. Product shots hang in the space as lit, framed displays. Every buyer gets an anonymous avatar and walks the store alongside other live buyers — multiplayer via the Supabase Realtime layer we already run for presence and the claim ticker. Clicking a product opens the existing checkout sheet.

The seller flow does not change at all: upload photos → agent drafts products + theme → review → publish. "Easiest way to set up a HitPay storefront" is fulfilled by the flow that already exists; the 3D world is what publishing now *produces*.

```
seller: images → agent → DropDraft (products + theme) → publish        (unchanged)
buyer:  link → WebGL-capable? → 3D world (theme-skinned template)
                             ↘ else / "view as list" → flat archetype page (unchanged, now the fallback)
```

**Invariant carried forward:** the agent proposes, deterministic code owns correctness — and now, geometry. The 3D scene is a **pure function** of `(products, theme)`. No new agent call, no new eval surface, no build pipeline. Checkout, stock math, webhooks, and trust chrome are untouched.

## 2. Decisions record (from grilling, 2026-07-19)

| Decision | Choice |
|---|---|
| Product 3D representation | **Framed billboards** — product images as lit framed displays / stand cards. No image-to-3D APIs. |
| Store design | **One hand-built template + theme skin.** Accent → lighting/sign/materials; `voice.dropTitle` → sign text; `tone` → ambience preset. |
| 3D config | **Deterministic** pure function; agent gets no new job. |
| Multiplayer depth | Presence + movement + emoji reactions + in-world claim/paid events. **No chat.** |
| Buy interaction | **Click/tap product → existing `BuyFlow` sheet** over the canvas. |
| Routing | **3D-first** when theme exists + WebGL passes; flat page is fallback + permanent "view as list" escape hatch. |
| Mobile | **Real touch controls** (virtual joystick + drag-look). |
| Branch reuse | **Keep everything**: agent draft, theme, flat archetypes (fallback), OG card. |
| Templates | **One** great template; second only if time remains. |
| Avatars | **Anonymous fun names** + stylized tinted blob. No login, no customization. |
| Seller preview | **None in builder.** Post-publish "Walk your store" link. three.js never enters the builder bundle. |
| Assets | **Procedural geometry** (three/drei primitives) + a few CC0 GLB props. |

## 3. Goals / non-goals

**Goals**

- A buyer opening a WhatsApp link lands *inside* the seller's store within a few seconds, sees other live shoppers moving around, and can buy in two taps.
- Two demo sellers (bake menu vs. sneaker shots) produce visibly different worlds from the **same template** — proof that theme-skinning carries identity into 3D.
- Full reuse: same DB rows, same checkout, same social channel topology, same theme.
- Runs acceptably on a mid-range phone (the demo device).

**Non-goals**

- No image-to-3D mesh generation, no scene generation, no store builder.
- No chat, no avatar customization, no accounts.
- No changes to claim engine, checkout, webhooks, stock math, or the seller builder flow.
- No second template unless Phase W3 finishes early.
- No agent involvement in 3D beyond the theme it already produces.

## 4. Architecture

### 4.1 New surface map

```
lib/world/
  scene-config.ts        pure (products, theme|null) → SceneConfig; unit-tested
  names.ts               presenceKey → deterministic fun name + avatar tint
components/world/
  world-gate.tsx          client gate: WebGL check, ?list=1, reduced-motion → World or flat
  world-canvas.tsx        <Canvas> shell, dynamic-imported ssr:false; DPR clamp, perf flags
  store-template.tsx      the shop: floor, walls, shelves/plinths (slots), counter, sign
  product-frame.tsx       one billboard: framed image, price tag, stock state, click target
  avatar.tsx              local + remote avatar (blob body, face, name tag, reaction bubbles)
  controls.tsx            desktop WASD + drag-look; mobile joystick + drag-look
  wall-ticker.tsx         in-world claim/paid ticker above the counter
lib/use-world-presence.ts realtime hook: world channel presence + move broadcasts
```

Dependencies added: `three`, `@react-three/fiber`, `@react-three/drei`. All world code is loaded via `next/dynamic` with `ssr: false` from `world-gate.tsx`, so the flat page and builder bundles are unaffected.

### 4.2 `SceneConfig` (pure derivation, no persistence)

No new DB columns and no readiness pipeline: since the scene is a pure function of data the page already loads, **a drop's world is "ready" the moment the drop is published**. Derived server-side in `app/[seller]/[drop]/page.tsx` and passed down as props.

```ts
export type SceneConfig = {
  template: 'shop'                       // the one template; enum for a future second
  accent: { l: number; c: number; h: number }   // theme.accent, already clamped
  sign: { title: string; sellerName: string }   // voice.dropTitle
  ambience: 'warm' | 'hype' | 'minimal'         // theme.voice.tone, direct map
  slots: Array<{
    productId: string
    imageUrl: string | null              // enhanced shot if present, else original, else placeholder card
    kind: 'shelf' | 'plinth'             // slot 0 (first in listing order) gets the plinth
  }>
}

export function buildSceneConfig(products: Product[], theme: StorefrontTheme | null): SceneConfig | null
// null theme → null config → flat page (drops published before themes keep working)
```

- Slot assignment = listing order (price desc — same query the flat page uses). First product takes the spotlight plinth near the entrance; the rest fill shelf slots left-to-right. Template supports up to 12 slots; overflow products exist only in the flat list view (acceptable: drops are small by thesis).
- Ambience presets are hand-tuned lighting rigs: `warm` (tungsten key + soft fill), `hype` (accent-colored rim + higher contrast), `minimal` (flat gallery daylight). Accent tints the hanging sign, shelf edge-lighting, and entrance mat — computed via the existing `oklchString` from [lib/theme.ts](lib/theme.ts).

### 4.3 Routing (`world-gate.tsx`)

`page.tsx` renders `<WorldGate config={sceneConfig} fallback={<flat storefront/>}>`. Client-side, the gate picks flat when any of: `sceneConfig === null`, `?list=1`, WebGL context creation fails, or `prefers-reduced-motion`. Otherwise it dynamic-imports the world with the flat page as the loading state — worst case a buyer sees the flat page for a beat, then enters the store. A persistent **"view as list"** pill inside the world flips to the flat page (sets `?list=1`, no reload of data). The flat page gets a matching **"enter the store"** pill when a config exists.

### 4.4 Multiplayer transport

Two channels per drop, one new:

- **`drop-{id}-world` (new):** Supabase Realtime **presence** (join payload: `{ name, tint }` from `lib/world/names.ts`, keyed by the existing anonymous per-tab `presenceKey()`) + **`move` broadcasts** `{ key, x, z, ry }` throttled to **10 Hz**, `self: false`. Remote avatars interpolate (lerp) between updates. Cap rendered remotes at **16**; beyond that, presence count still shows on the wall ticker ("23 shopping now").
- **`drop-{id}-social` (existing, unchanged wire format):** server-emitted claim/paid events from [lib/social-server.ts](lib/social-server.ts) render as the **wall ticker** line + a brief sparkle burst on the sold product's frame. Client `react` events gain one optional field, `key` (the sender's presence key), so reactions float above the sender's avatar in-world; the flat page's `ReactionLayer` ignores it — backward compatible.

Everything degrades to silence, same philosophy as [lib/use-drop-social.ts](lib/use-drop-social.ts): if realtime is blocked you shop alone in a working store.

### 4.5 Stock truth in-world

`ProductFrame` renders from the same polled/merged product state the flat page uses (5 s poll + monotonic `stock_sold` merge in [drop-storefront.tsx](app/[seller]/[drop]/drop-storefront.tsx) — that state hook gets lifted into the shared gate so both renderers consume it). Low stock → existing `StockBadge` semantics as a frame tag; sold out → frame dims to grayscale with a "GONE" tag and stops being clickable. Window ended → sign switches to "closed", frames stay browsable, buy disabled. Server-side claim validation remains the only truth, exactly as today.

## 5. The world itself

> Visual/taste direction for everything in this section lives in [3d-world-design.md](3d-world-design.md) — materials, lighting rig, motion rules, avatar palette. That doc governs where this one is silent.

### 5.1 Template ("shop")

One rectangular room, roughly 14×10 m: entrance at one end, counter at the far end under the hanging fascia sign (`voice.dropTitle` in the display face, seller name below), two shelf walls with up to 11 framed slots, one spotlight plinth near the entrance for the hero product. Procedural props for warmth: plants, counter clutter, rug, string lights, pendant lamps, scalloped entrance awning. All geometry procedural three/drei primitives with good materials; contact shadows on desktop only.

### 5.2 Product frames

Textured plane in a slim 3D frame, angled toward the aisle, individually lit. Price + name on a small card below the frame (drei `<Text>`, mono numerals — same typographic rules as `Price`). Hover/proximity: frame glows softly in the seller accent. Click/tap (raycast): camera eases to face the frame and the existing **`BuyFlow`** sheet ([components/ds/buy-flow.tsx](components/ds/buy-flow.tsx)) slides over the canvas as normal 2D DOM. Trust chrome rule holds structurally: the sheet renders outside the canvas and never reads theme variables.

### 5.3 Avatars & controls

- Body: capsule blob + simple face, tinted `tint` (pleasant-hue hash of presence key); name tag above (`names.ts` wordlist, e.g. "kaya-toast-7"). Local avatar third-person, camera follows.
- Desktop: WASD/arrows + pointer-drag look. Mobile: left-thumb virtual joystick (custom, ~50 lines) + right-thumb drag look. Movement clamped to the room's floor rect — no physics engine, plain AABB walls.
- Reactions: the existing two-emoji bar overlays the canvas; tapping emits on the social channel and pops the emoji above your avatar (and on remotes via `key`).

## 6. Seller-facing changes (the only ones)

- Publish success panel / seller console links gain **"Walk your store"** → the buyer URL. That's it.
- Builder flow, storefront review card, `/api/draft`, `/api/drops`: untouched.

## 7. Data & API changes

**None.** No migrations, no new routes. The world channel is client-side Realtime only; scene config is derived at request time. (This is the payoff of the deterministic-config decision.)

## 8. Phases

| Phase | Scope | Proof |
|---|---|---|
| **W1 — Solo world** | deps, `scene-config` + tests, gate + escape hatches, template, frames, lighting/ambience, desktop + mobile controls, click→BuyFlow, stock states | One phone + one laptop: walk a themed store, buy a product end-to-end, sell it out, see GONE; `?list=1` and non-WebGL fall back cleanly |
| **W2 — Multiplayer** | world channel presence + move, remote avatars w/ interpolation, name tags, reactions above avatars, wall ticker + frame sparkle on claim/paid | Two devices see each other move in <300 ms perceived; a purchase on device A sparkles on device B |
| **W3 — Polish** | props, ambience preset tuning, camera ease on product focus, entrance moment (walk in through the door), perf pass on mid phone, "enter the store" pill on flat page | Demo runbook: two sellers, two worlds, visibly different, 30+ fps on the demo phone |

## 9. Testing (hackathon-relaxed)

- **Unit (kept):** `buildSceneConfig` — slot order matches listing order, plinth = first product, null theme → null, image fallback chain, >12 products truncates.
- **Unit (kept):** `names.ts` determinism — same presence key, same name/tint.
- **Manual runbook (replaces integration/CI):** the W1/W2 proofs above, plus: flat page pixel-unchanged when world is skipped; reaction from world shows on a flat-page viewer and vice versa.
- **Dropped for hackathon:** snapshot tests, perf budgets in CI, cross-browser matrix beyond Chrome + iOS Safari.

## 10. Risks

- **Mobile perf.** Biggest real risk. Mitigations: DPR clamp (≤1.5), no shadows on mobile, ≤16 remote avatars, single room, frustum-friendly layout, `frameloop="demand"` is *not* usable (multiplayer) so keep draw calls low instead. Escape hatch is one tap away.
- **Position-spam channel costs/limits.** 10 Hz × N clients on Supabase broadcast is fine at demo scale; do not ship to real traffic without revisiting (documented here as the known cliff).
- **"Pictures in a room" underwhelm.** Counter-mitigations: lighting/ambience quality is the whole game — spend W3 there; the multiplayer liveness and claim sparkles are the freshness, not the meshes.
- **three.js bundle weight on the buyer route.** Dynamic import keeps flat/fallback fast; world chunk loads behind the flat-page loading state.
- **Two renderers drift.** Both consume the same lifted product-state hook and the same theme; the flat page is demoted to fallback but never forked.
