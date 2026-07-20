import type { StorefrontTheme } from '@/lib/drop-builder'
import type { Product } from '@/lib/types'

export const MAX_WORLD_PRODUCTS = 12

export type SceneConfig = {
  template: 'shop'
  accent: StorefrontTheme['accent']
  sign: { title: string; sellerName: string }
  ambience: StorefrontTheme['voice']['tone']
  slots: Array<{
    productId: string
    imageUrl: string | null
    kind: 'shelf' | 'plinth'
  }>
}

type SceneProduct = Pick<Product, 'id' | 'image_url'> & {
  enhanced_image_url?: string | null
  original_image_url?: string | null
}

/**
 * Geometry stays deterministic: listing order is spatial order, and a theme
 * is the only prerequisite for a world. The optional seller name is display
 * copy only and does not affect layout.
 */
export function buildSceneConfig(
  products: readonly SceneProduct[],
  theme: StorefrontTheme | null,
  sellerName = '',
): SceneConfig | null {
  if (!theme) return null

  return {
    template: 'shop',
    accent: theme.accent,
    sign: {
      title: theme.voice.dropTitle,
      sellerName,
    },
    ambience: theme.voice.tone,
    slots: products.slice(0, MAX_WORLD_PRODUCTS).map((product) => ({
      productId: product.id,
      imageUrl:
        product.enhanced_image_url ??
        product.image_url ??
        product.original_image_url ??
        null,
      kind: 'shelf',
    })),
  }
}
