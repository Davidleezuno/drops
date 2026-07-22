import Image from 'next/image'

import { BuyFlow } from '@/components/ds/buy-flow'
import { Price } from '@/components/ds/price'
import { StockBadge } from '@/components/ds/stock-badge'
import { isSoldOut, stockRemaining } from '@/lib/drop-state'
import type { Product } from '@/lib/types'

/**
 * Compact, photo-first product presentation for the two-column storefront.
 * The grid intentionally keeps option details in checkout so every card has
 * the same quiet, scannable hierarchy on a phone.
 */
export function ProductGridCard({
  product,
  fulfilment,
  deliveryFee,
  pickupNote,
  priority = false,
}: {
  product: Product
  fulfilment: 'pickup' | 'delivery' | 'both'
  deliveryFee: number
  pickupNote: string | null
  priority?: boolean
}) {
  const remaining = stockRemaining(product)
  const soldOut = isSoldOut(product)
  const hasVariablePrice =
    new Set(product.variants.map((variant) => variant.price)).size > 1

  return (
    <article className="flex h-full min-w-0 flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`${product.name} product shot`}
            fill
            className="object-cover transition-transform duration-300 motion-safe:hover:scale-[1.02]"
            sizes="(max-width: 448px) 50vw, 208px"
            priority={priority}
          />
        ) : (
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,var(--color-card),var(--color-muted))]"
            aria-hidden="true"
          />
        )}
        {soldOut && (
          <span className="absolute right-2 bottom-2 rounded-full bg-foreground px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-background uppercase">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <h2 className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold text-pretty">
          {product.name}
        </h2>
        {product.variant && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {product.variant}
          </p>
        )}

        <div className="mt-2 flex min-h-6 items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1">
            {hasVariablePrice && (
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                From
              </span>
            )}
            <Price amount={product.price} className="text-base font-semibold" />
          </div>
          {!soldOut && (
            <StockBadge
              key={remaining ?? -product.stock_sold}
              remaining={remaining}
              sold={product.stock_sold}
              className="animate-tick text-[10px]"
            />
          )}
        </div>
      </div>

      <BuyFlow
        productId={product.id}
        productName={product.name}
        unitPrice={product.price}
        remaining={remaining}
        inventoryChoiceName={product.inventory_choice_name}
        variants={product.variants}
        customizationGroups={product.customization_groups}
        fulfilment={fulfilment}
        deliveryFee={deliveryFee}
        pickupNote={pickupNote}
        triggerClassName="mt-3 h-11"
      />
    </article>
  )
}
