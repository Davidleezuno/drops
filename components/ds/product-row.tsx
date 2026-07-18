import { Price } from "@/components/ds/price"
import { StockBadge, stockState } from "@/components/ds/stock-badge"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * One product in a drop: name + variant + price on the left, the scarcity
 * ladder on the right. Sold-out rows stay listed but recede.
 */
export function ProductRow({
  product,
  className,
}: {
  product: Product
  className?: string
}) {
  const remaining = product.stock_total - product.stock_sold
  const soldOut = stockState(remaining) === "soldout"

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-opacity",
        soldOut && "opacity-60",
        className
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold">{product.name}</p>
        {product.variant && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {product.variant}
          </p>
        )}
        <Price amount={product.price} className="mt-1.5 block" />
      </div>
      <StockBadge remaining={remaining} />
    </div>
  )
}
