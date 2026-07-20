import type { Drop, Product, ProductVariant } from '@/lib/types'

/**
 * Both scarcity axes are optional (future-ideas §3): a null stock_total is an
 * uncapped product, a null window_ends_at is a link that never expires. These
 * helpers are the one place that null-awareness lives.
 */

/** Units left to sell, or null when the product is uncapped. */
export function stockRemaining(
  product: Pick<Product, 'stock_total' | 'stock_sold'>,
): number | null {
  return product.stock_total === null
    ? null
    : product.stock_total - product.stock_sold
}

export function isSoldOut(
  product: Pick<Product, 'stock_total' | 'stock_sold'>,
): boolean {
  const remaining = stockRemaining(product)
  return remaining !== null && remaining <= 0
}

export function variantStockRemaining(
  variant: Pick<ProductVariant, 'stock_total' | 'stock_sold'>,
): number | null {
  return variant.stock_total === null
    ? null
    : variant.stock_total - variant.stock_sold
}

export function isVariantSoldOut(
  variant: Pick<ProductVariant, 'stock_total' | 'stock_sold'>,
): boolean {
  const remaining = variantStockRemaining(variant)
  return remaining !== null && remaining <= 0
}

/** True only when every product is capped and exhausted. */
export function allSoldOut(
  products: Pick<Product, 'stock_total' | 'stock_sold'>[],
): boolean {
  return products.length > 0 && products.every(isSoldOut)
}

export function dropWindowClosed(
  drop: Pick<Drop, 'window_ends_at' | 'status'>,
  now = Date.now(),
): boolean {
  if (drop.status === 'ended') return true
  return (
    drop.window_ends_at !== null &&
    new Date(drop.window_ends_at).getTime() <= now
  )
}
