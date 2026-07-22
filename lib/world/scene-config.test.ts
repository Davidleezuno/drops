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
  display_kind: 'served' as const,
}))

describe('buildSceneConfig', () => {
  it('composes balanced three-product stations and truncates overflow', () => {
    const config = buildSceneConfig(products, theme, 'Sarah')
    const slots = config?.stations.flatMap((station) => station.slots) ?? []

    expect(slots).toHaveLength(MAX_WORLD_PRODUCTS)
    expect(config?.stations).toHaveLength(4)
    expect(config?.stations.map((station) => station.slots.length)).toEqual([
      3, 3, 3, 3,
    ])
    expect(config?.stations.map((station) => station.kind)).toEqual([
      'serving',
      'dresser',
      'packing',
      'serving',
    ])
    expect(slots[1]).toMatchObject({
      productId: 'product-1',
      imageUrl: 'original.jpg',
      displayKind: 'served',
    })
    expect(config?.sign).toEqual({ title: "Tonight's bake", sellerName: 'Sarah' })
  })

  it('uses product-appropriate furniture and a safe legacy fallback', () => {
    const config = buildSceneConfig(
      [
        { id: 'dress', image_url: null, display_kind: 'hung' },
        { id: 'print', image_url: null, display_kind: 'framed' },
        { id: 'legacy', image_url: null },
      ],
      theme,
    )

    expect(config?.stations[0].kind).toBe('rail')
    expect(config?.stations.flatMap((station) => station.slots)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: 'legacy', displayKind: 'shelved' }),
      ]),
    )
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
      ],
      theme,
    )

    expect(
      config?.stations.flatMap((station) => station.slots).map((slot) => slot.imageUrl),
    ).toEqual(['enhanced.jpg', 'selected.jpg', 'source.jpg'])
  })

  it('returns null without a theme', () => {
    expect(buildSceneConfig(products, null)).toBeNull()
  })
})
