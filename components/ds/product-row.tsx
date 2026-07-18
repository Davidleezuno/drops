import Image from "next/image"

import { Price } from "@/components/ds/price"
import { StockBadge, stockState } from "@/components/ds/stock-badge"
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
  const remaining = product.stock_total - product.stock_sold
  const soldOut = stockState(remaining) === "soldout"

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 transition-opacity",
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
            className="object-cover"
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
          <Price amount={product.price} className="mt-1.5 block" />
        </div>
        <StockBadge
          key={remaining}
          remaining={remaining}
          className="animate-tick"
        />
      </div>

      <BuyFlow
        productId={product.id}
        productName={product.name}
        unitPrice={product.price}
        remaining={remaining}
        fulfilment={fulfilment}
        deliveryFee={deliveryFee}
        pickupNote={pickupNote}
      />
    </article>
  )
}
