import { type DropDraft, dropDraftSchema } from '../drop-builder'

const fixture: DropDraft = {
  products: [
    {
      name: 'Brown Butter Sea Salt Cookie Box',
      variant: 'Box of 6',
      price: 24,
      sourceImageIndex: 0,
    },
    {
      name: 'Pistachio Raspberry Tart',
      variant: null,
      price: 12,
      sourceImageIndex: 0,
    },
    {
      name: 'Dark Chocolate Banana Loaf',
      variant: 'Whole loaf',
      price: 28,
      sourceImageIndex: 0,
    },
  ],
  theme: {
    accent: { l: 0.56, c: 0.13, h: 48 },
    archetype: 'menu',
    vertical: 'fnb',
    hero: {
      source: 'upload-crop',
      sourceImageIndex: 0,
      crop: { x: 0, y: 0.18, w: 1, h: 0.42 },
    },
    voice: {
      dropTitle: "Tonight's kitchen bake",
      sellerNote: 'Small-batch bakes, packed warm for your evening treat.',
      tone: 'warm',
    },
    ogCard: {
      headline: 'Fresh from the oven tonight',
      badge: 'Small batch',
    },
  },
  paletteCandidates: [
    { l: 0.56, c: 0.13, h: 48 },
    { l: 0.55, c: 0.12, h: 24 },
    { l: 0.52, c: 0.1, h: 92 },
    { l: 0.54, c: 0.11, h: 342 },
  ],
  needsInput: ['stock', 'window'],
}

export const dropDraftFixture = dropDraftSchema.parse(fixture)
