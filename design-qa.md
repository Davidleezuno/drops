# Storefront shophouse refresh — design QA

- Source visual truth: `/tmp/drops-storefront-audit/01-shophouse-desktop.png`
- Implementation desktop: `/tmp/drops-storefront-qa/13-framed-spread-desktop-final.png`
- Implementation mobile: `/tmp/drops-storefront-qa/12-framed-spread-mobile-final.png`
- Full-view comparison: `/tmp/drops-storefront-qa/14-old-frame-vs-final.png`
- Viewports: 1280×720 desktop and 390×844 mobile
- State: Roti Wife themed storefront, initial walk-in view. The sandbox drop is expired, so the production sign and list correctly show the closed state. The source uses prototype catalogue copy while the implementation uses live seeded product data.

## Findings

No actionable P0, P1, or P2 visual findings remain.

- Fonts and typography: production UI retains the existing Instrument Sans/Bricolage/Geist Mono hierarchy. The in-world wooden sign uses the same display and mono font assets as the storefront system; product labels remain the existing live `ProductFrame` typography.
- Spacing and layout rhythm: the prototype's open floor, offset doorway, bordered rug, arched back wall, counter, window, and exposed beams are preserved. A continuous dark-oak floor/ceiling ring plus four corner posts now clearly bounds the dollhouse. Products circulate across four walls instead of filling one gallery row.
- Colors and visual tokens: limewash cream, warm oak, dark ink trim, terracotta/sage props, brass details, and soft morning light match the source direction. Seller accent remains data-driven and is confined to identity surfaces.
- Image quality and asset fidelity: the implementation uses the existing real seller product photography with cover crops; no placeholder or synthetic product imagery was introduced.
- Copy and content: prototype-only explanatory copy and variant controls are omitted intentionally. Live seller name, status, stock, price, reactions, and list escape remain unchanged.
- Icons and controls: production list, movement, and reaction controls are retained because they are required functionality outside the passive source prototype.
- Accessibility: the existing WebGL capability check, reduced-motion fallback, persistent list escape, semantic overlay buttons, and 44px mobile controls remain intact.
- Responsive behavior: at 390×844 the top controls, joystick, reactions, structural boundary, avatar, and products on opposing walls are visible without persistent-control overlap or horizontal page overflow.

## Comparison history

### Iteration 1

- Earlier finding: **P1 — opaque doorway glow blocked the production follow camera.** The source's outdoor glow plane works with an orbit camera but filled the live walk-in viewport.
- Fix: removed the doorway glow plane while retaining the large window glow and the shophouse lighting rig.
- Post-fix evidence: `/tmp/drops-storefront-qa/02-shophouse-refresh-desktop-fixed.png`.

### Iteration 2

- Earlier finding: **P1 — the initial 390px view did not reveal merchandise.** The straight-ahead camera showed the open floor before any product frames.
- Fix: angled the initial player/camera heading toward the equal-priority gallery wall. No product was promoted to a hero.
- Post-fix evidence: `/tmp/drops-storefront-qa/05-shophouse-refresh-mobile-final.png`.

### Iteration 3

- Earlier finding: **P1 — wall planes ended without a visible structural boundary.** The room read as clipped geometry floating in the scene instead of a complete shop.
- Fix: added a continuous dark-oak top and base ring with full-height posts at all four corners, matching the strong shop-window silhouette of the previous renderer.
- Post-fix evidence: `/tmp/drops-storefront-qa/13-framed-spread-desktop-final.png`.

### Iteration 4

- Earlier finding: **P2 — low-count catalogues clustered products on the left wall.** That concentrated both visual attention and likely shopper movement in one corner.
- Fix: changed deterministic slot order so the first four products seed four different walls; subsequent products continue circulating around the room up to the 12-slot limit.
- Post-fix evidence: `/tmp/drops-storefront-qa/12-framed-spread-mobile-final.png` and `/tmp/drops-storefront-qa/13-framed-spread-desktop-final.png`.

## Focused comparison evidence

The original-resolution desktop and mobile captures were inspected for sign typography, product image sharpness, stock-card spacing, doorway trim, window/curtain treatment, awning stripes, and persistent controls. A separate crop was not needed because those surfaces are legible at the saved native resolutions.

## Functional verification

- Production build and TypeScript compilation passed.
- Focused ESLint pass passed.
- `lib/world/scene-config.test.ts`: 3/3 passed, including 12 equal wall slots and overflow truncation.
- Browser-rendered desktop and 390×844 mobile states captured.
- `View as list` → ended list state → `Enter the store` round trip passed.
- Browser console contained no application errors. Existing Three.js clock/shadow deprecation warnings remain.
- Live checkout could not be re-run because every themed sandbox fixture is currently past its selling window. Product selection and `BuyFlow` wiring were not changed by this refresh.

## Follow-up polish

- P3: tune the initial yaw per device after testing on the actual demo phone.
- P3: revisit the upstream Three.js deprecation warnings when dependencies are next upgraded.

final result: passed
