# 3D World — Design Direction

**Status:** direction for `docs/3d-storefront-spec.md` §5, derived from [design-brief.md](design-brief.md). The brief's line — *"the interface is a well-lit shop floor"* — was a metaphor. This document is what happens when we build the actual floor. Every rule here is the 2D system's rule, restated for a third dimension; when a 3D question isn't answered here, answer it from the brief.

---

## 1. The one-line direction

**A small, daylit gallery-shop: warm white room, ink details, the seller's photos as the only saturated things in it.** Nike-store cleanliness at architectural scale; the warmth comes from light temperature, material softness, and other live shoppers — not from clutter or decoration.

The room is the "clean court." The products and the people are the "warm flame." The building must never compete with either.

## 2. Anti-references (what this world must not feel like)

Extending the brief's list into 3D — these are the default failure modes of hackathon Three.js and each one is banned:

- **Roblox / Fortnite plastic** — saturated primary colors, glossy toy materials, bouncy idle animation. Our sellers sell laksa, not loot.
- **Cyberpunk neon mall** — dark room + glowing everything. Neon is permitted in exactly one place (the sign, §5) and it's warm.
- **Archviz showroom** — photoreal PBR, mirror floors, HDRI glare. Reads corporate; also unreachable on a mid phone, so attempts at it read *broken* corporate.
- **Low-poly craft-fair cute** — pastel voxels, wobbly charm. This is the artisan-cliché failure mode from the brief wearing a 3D costume.
- **The liminal void** — floating frames in fog. Cold, art-project, person-less.

Litmus test: screenshot the room with no products in it. It should look like a freshly painted shop the day before opening — expectant, warm, a little empty. Not a game level.

## 3. Space & proportion (white space, but volumetric)

- **Small and intimate.** ~14×10 m, ~3.2 m ceiling. A buyer sees the whole store from the entrance in one glance — the 3D equivalent of "one calm list." Never add square metres; add air.
- **Generous negative space** is the luxury signal. ≥1.6 m between frames. Frames hang at eye level (center ~1.5 m) in one clean line per wall — a hung gallery row, not a merchandising wall. If 12 products feels tight, the room is not enlarged; the flat list absorbs overflow (spec §4.2).
- **One hierarchy move**, same as the flat page: the hero product's plinth near the entrance is the only object that breaks the wall rhythm. Everything else is even, quiet rhythm.
- **Sight line:** entrance → hero plinth → counter + sign at the far end. The seller's name is the terminating view, because the person is the hero.

## 4. Material & color

Map the token system onto surfaces. One neutral ramp per room, no drift — exactly the brief's rule.

| Surface | Treatment | Token logic |
|---|---|---|
| Walls, ceiling | Matte warm white, very subtle roughness variation | `--background` (oklch ≈0.987 h84) |
| Floor | Pale warm oak *or* warm light concrete — matte, **no reflections** | the warm-neutral ramp, one step down |
| Plinths, counter body | Pure white matte blocks, rounded top edges (~2xl radius read) | `--card` |
| Frames, counter top edge, door trim, ticker housing | Warm ink near-black, satin matte | `--primary` — **ink is the structure**, as it is the CTA |
| Sign glow, hero plinth halo, shelf edge-light, entrance mat | Seller accent, and nowhere else | `--seller-accent` = identity surfaces only |
| Ticker text moments, GONE tags, live dot | System semantic tokens (`--live`, `--low`, `--alarm`, flame) | trust chrome — never re-tinted by theme |

Rules:

- **Everything matte.** Roughness ≥0.8 on architecture. Gloss is how 3D looks cheap; matte is how it looks calm. The only specular thing in the room is the subtle sheen on ink frames.
- **The accent budget is unchanged: one accent, scarce.** The seller accent appears as *light*, not paint — sign glow, plinth halo, a soft edge-light along shelves. Walls are never tinted. If you can see the accent from every camera angle at once, it's overspent.
- **No textures with opinions.** No wallpaper, no posters, no wood grain louder than a whisper. Product photos are the only images in the room.

## 5. Light (this is 80% of the taste)

Light-mode-first means **daylight**. The room reads as mid-morning, not moody evening — chat links open in daylight and food photos need honest color.

- **Base rig (all ambiences):** warm hemisphere ambient (sky slightly cool, ground warm bounce) + one broad soft key like window light, ~4500–5000 K. No visible sun disc, no god rays. Contact shadows under avatars/plinths on desktop; none on mobile.
- **Every product frame gets its own quiet spotlight** — slightly warm, feathered edge, like real gallery track lighting. Products must look *lit on purpose*; this is the single highest-value polish item in the build.
- **The sign** is the room's one glow: seller accent, soft bloom-free emissive (fake the halo with a gradient plane — real bloom is a mobile perf trap), `voice.dropTitle` in the display face, seller name beneath in sans. A small breathing live-dot beside it when the window is open — the LivePill, promoted to signage.
- **Ambience presets** move *temperature and contrast only*, never hue and never geometry:
  - `warm` — softest key, warmest fill, lowest contrast. The home-bakery default.
  - `hype` — cooler key, +contrast, accent edge-light slightly stronger, shadows a touch harder. Energy from light, not motion.
  - `minimal` — flattest, most even, near-shadowless gallery daylight.

## 6. Typography in-world

Same three faces, same jobs, rendered with drei `<Text>`:

- **Bricolage Grotesque** — the sign's drop title only. Display face = headlines; a room has exactly one headline.
- **Instrument Sans** — product names on frame cards, avatar name tags, wayfinding ("view as list" pill).
- **Geist Mono, tabular** — every machine number: prices on frame cards, the ticker's counts, stock tags. Mono numerals at 3D scale is the system's signature; do not substitute.
- Price cards under frames are white rounded cards with sans name + mono price — a `ProductRow` that happens to be mounted on a wall. Text always faces the aisle; never curved, never extruded. Type in this world is *printed on things*, not made of things.

## 7. Motion (stillness is the point)

The brief's law holds absolutely: **motion is reserved for real events, and it means nothing if idle decoration moves too.** In 3D the temptation triples; resist it.

- **Idle room = still room.** No bobbing frames, no rotating products, no particle dust, no swaying plants. The one persistent motion is the sign's live-dot breathing (the genuinely-open-channel signal, same as 2D).
- **People are the ambient motion.** Avatars walking, name tags drifting past frames, reactions popping — the room feels alive exactly when it *is* alive. An empty store is quiet and still, and that's honest.
- **Event motions, mapped from the 2D system:**
  - Claim/paid → one brief sparkle burst on that product's frame + ticker line slides in (`animate-rise` energy: rise + fade, ~0.7 s, then still).
  - Stock threshold change → the frame's stock tag does the `animate-tick` scale pulse.
  - Sold out → frame dims to grayscale over ~0.4 s, ink **GONE** tag stamps on with the SOLD OUT poster's slight tilt. Terminal states are posters — even on a wall.
- **Camera is furniture, not a character.** No head-bob, no FOV kicks, no camera shake ever. Movement eases in/out (~150 ms); the product-focus glance on tap is one smooth ease (~600 ms, interruptible). `prefers-reduced-motion` already routes to the flat page (spec §4.3).

## 8. Avatars

People, drawn in the product's voice: **soft, matte, warm, a little understated** — Instrument Sans as a creature, not a Fortnite skin.

- Capsule blob, matte, subtle top-light. Face is minimal ink: two oval eyes, small smile. No limbs (a gentle lean-into-motion tilt sells walking better than legs we'd animate badly).
- **Tints come from a curated palette, not random hue.** ~8 hand-picked warm-leaning, mid-chroma colors (dusty peach, sage, butter, clay, powder blue…) that all sit harmoniously on the warm-white room and never collide with flame, live-green, low-amber, or alarm-red. Hash of presence key picks from the set.
- Name tag: small white pill, sans, ink text — a floating `StatusPill`. Fades with distance.
- Reactions pop above the head at emoji-native size, drift up, fade — same register as the flat page's `ReactionLayer`; emoji is allowed here because it's the social-native surface.

## 9. Sound

**None.** Silence is the clean court. (If W3 has spare hours: one soft click on tap-to-buy open, nothing ambient, always off until first interaction — but the default answer is no.)

## 10. Taste checklist (apply before every W3 merge)

1. Screenshot test (§2): empty room looks like a real small shop, not a level.
2. Count the accents: seller accent visible in ≤3 places from any standpoint; flame only on system moments; zero decorative color.
3. Is anything moving right now that isn't a person, a live-dot, or an event? Delete it.
4. Are all numbers mono-tabular, all names sans, exactly one display-face headline?
5. Does the product photo look better lit here than it does on the flat page? If not, fix the frame spotlight before adding anything else.
6. Would Sarah the baker feel this is *her* shop? Accent, sign copy, and photos should carry her; the room should disappear.
