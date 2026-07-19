import { describe, expect, it } from 'vitest'

import type { StorefrontTheme } from '@/lib/drop-builder'

import { buildSceneConfig, MAX_WORLD_PRODUCTS } from './scene-config'

const theme: StorefrontTheme = {
  accent: { l: 0.6, c: 0.14, h: 42 },
  archetype: 'menu',
  vertical: 'fnb',
  hero: { source: 'none', sourceImageIndex: null, crop: null },
  voice: { dropTitle: "Tonight's bake", sellerNote: null, tone: 'warm' },
  ogCard: { headline: 'Fresh tonight', badge: null },
}

const products = Array.from({ length: 14 }, (_, index) => ({
  id: `product-${index}`,
  image_url: index === 1 ? 'original.jpg' : null,
}))

describe('buildSceneConfig', () => {
  it('keeps listing order, spotlights the first product, and truncates overflow', () => {
    const config = buildSceneConfig(products, theme, 'Sarah')

    expect(config?.slots).toHaveLength(MAX_WORLD_PRODUCTS)
    expect(config?.slots[0]).toMatchObject({
      productId: 'product-0',
      kind: 'plinth',
    })
    expect(config?.slots[1]).toMatchObject({
      productId: 'product-1',
      kind: 'shelf',
      imageUrl: 'original.jpg',
    })
    expect(config?.sign).toEqual({ title: "Tonight's bake", sellerName: 'Sarah' })
  })

  it('uses the enhanced, selected, then original image fallback chain', () => {
    const config = buildSceneConfig(
      [
        {
          id: 'one',
          enhanced_image_url: 'enhanced.jpg',
          image_url: 'selected.jpg',
          original_image_url: 'source.jpg',
        },
        {
          id: 'two',
          enhanced_image_url: null,
          image_url: 'selected.jpg',
          original_image_url: 'source.jpg',
        },
        {
          id: 'three',
          enhanced_image_url: null,
          image_url: null,
          original_image_url: 'source.jpg',
        },
        {
          id: 'four',
          enhanced_image_url: null,
          image_url: null,
          original_image_url: null,
        },
      ],
      theme,
    )

    expect(config?.slots.map((slot) => slot.imageUrl)).toEqual([
      'enhanced.jpg',
      'selected.jpg',
      'source.jpg',
      null,
    ])
  })

  it('returns null without a theme', () => {
    expect(buildSceneConfig(products, null)).toBeNull()
  })
})
