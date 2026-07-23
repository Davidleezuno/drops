import Image from "next/image"

import { Price } from "@/components/ds/price"
import { StockBadge } from "@/components/ds/stock-badge"
import { isSoldOut, stockRemaining } from "@/lib/drop-state"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"

import { BuyFlow } from "./buy-flow"

/**
 * One product in a drop: name + variant + price on the left, the scarcity
 * ladder on the right. Sold-out rows stay listed but recede.
 */
export function ProductRow({
  product,
  fulfilment,
  deliveryFee,
  pickupNote,
  className,
}: {
  product: Product
  fulfilment: "pickup" | "delivery" | "both"
  deliveryFee: number
  pickupNote: string | null
  className?: string
}) {
  const remaining = stockRemaining(product)
  const soldOut = isSoldOut(product)
  const visibleVariants = [...product.variants]
    .sort((a, b) => a.position - b.position)
    .filter((variant) => variant.label)
  const hasVariablePrice = new Set(product.variants.map((variant) => variant.price)).size > 1

  return (
    <article
      className={cn(
        "group/row relative rounded-2xl border border-border bg-card p-4 transition-[border-color,opacity]",
        !soldOut && "hover:border-foreground/20",
        soldOut && "opacity-60",
        className
      )}
    >
      {product.image_url && (
        <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-muted sm:aspect-[4/3]">
          <Image
            src={product.image_url}
            alt={`${product.name} product shot`}
            fill
            className="object-cover transition-transform duration-300 motion-safe:group-hover/row:scale-[1.01]"
            sizes="(max-width: 448px) 100vw, 448px"
            priority={false}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">{product.name}</p>
          {product.variant && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {product.variant}
            </p>
          )}
          {visibleVariants.length > 1 && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {product.inventory_choice_name || 'Options'}:{' '}
              {visibleVariants.map((variant) => variant.label).join(' · ')}
            </p>
          )}
          {product.customization_groups.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {product.customization_groups
                .map((group) => group.name)
                .join(' · ')}
            </p>
          )}
          {hasVariablePrice && (
            <span className="mt-1.5 block font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              From
            </span>
          )}
          <Price
            amount={product.price}
            className={hasVariablePrice ? 'block text-lg font-semibold' : 'mt-1.5 block text-lg font-semibold'}
          />
        </div>
        <StockBadge
          key={remaining ?? -product.stock_sold}
          remaining={remaining}
          sold={product.stock_sold}
          className="animate-tick"
        />
      </div>

      {!soldOut && (
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
          triggerClassName="absolute inset-0 z-10 rounded-2xl outline-none transition-colors duration-150 active:bg-foreground/[0.025] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 motion-reduce:transition-none"
          triggerContent={<span className="sr-only">Buy {product.name}</span>}
        />
      )}
    </article>
  )
}
