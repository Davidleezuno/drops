# Mobile product grid entry CTA — design QA

- Source visual truth: `/Users/davidlee/.codex/generated_images/019f8a75-2dc3-7040-a030-e6e6bdc15b68/call_HF04HBPELOBKs084RN5KuEWb.png`
- Implementation screenshot: `/tmp/drops-enter-store-final.png`
- Full-view comparison: `/tmp/drops-enter-store-comparison.jpg`
- Focused button comparison: `/tmp/drops-enter-store-button-comparison.jpg`
- Viewport: 390 × 844 CSS px at device scale factor 1
- Source pixels: 853 × 1844, normalized to 390 × 844 with a north-aligned cover crop
- Implementation pixels: 390 × 844
- State: default buyer product grid with the fixed Enter store CTA visible

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation retains the existing storefront font hierarchy and closely matches the selected reference’s label size, weight, and contrast.
- Spacing and layout rhythm: the CTA is a 44px touch target at the same bottom-right inset as the selected reference. Removing the repeated Buy bars makes the catalogue denser while preserving the two-column rhythm.
- Colors and visual tokens: the existing warm background, near-black action surface, off-white foreground, radius, and elevation tokens are preserved.
- Image quality and asset fidelity: existing seller product photography remains unchanged and sharp. The doorway uses the project’s Lucide icon system rather than a custom approximation.
- Copy and content: the CTA label is exactly “Enter store.” Repeated visible Buy labels are removed; available product cards retain accessible “Buy {product}” names.
- Interaction and accessibility: each available card opens its existing checkout; sold-out cards remain inert. The door rotates in perspective for 280ms before store entry, the CTA compresses for tactile feedback, and reduced-motion CSS removes the transition.

## Full-view comparison evidence

The combined comparison shows that the implementation preserves the selected option’s product-grid context, bottom-right placement, compact dark pill, and open-door cue. The missing per-card Buy bars are an intentional user-requested change after selection, not fidelity drift.

## Focused comparison evidence

The focused crop confirms matching control height, pill radius, label hierarchy, and elevation. The implementation uses a thinner library doorway glyph than the generated mock; this is intentional so the icon remains consistent with the product’s existing iconography and animates cleanly.

## Functional verification

- TypeScript compilation passed.
- Focused ESLint passed for all changed TypeScript files.
- The repository-wide lint command remains blocked by an unrelated existing `react-hooks/immutability` error in `components/landing/storefront-model.tsx`.
- Browser test: tapping the first product card opened its checkout dialog without removing the visible card content.
- Browser test: tapping Enter store set `data-opening="true"`, then navigated to `?store=1` and loaded the interactive store.
- Browser console contained no errors.

## Comparison history

### Iteration 1

- Earlier finding: product content was nested directly inside a button, weakening document semantics and allowing the grid item to disappear from the underlying layout while checkout was open.
- Fix: kept each product as an article and added a full-card semantic button overlay with an accessible product-specific label.
- Post-fix evidence: `/tmp/drops-enter-store-final.png`; the browser accessibility tree preserves the article, image, heading, price, stock, and unique checkout button.

## Follow-up polish

- P3: the thin doorway glyph is more restrained than the generated mock’s filled warm doorway; retain it unless real-device feedback asks for stronger visual emphasis.

final result: passed
