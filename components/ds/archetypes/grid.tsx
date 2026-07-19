import { ProductRow } from '@/components/ds/product-row'
import type { StorefrontTheme } from '@/lib/drop-builder'
import type { Product } from '@/lib/types'

type ArchetypeProps = {
  theme: StorefrontTheme
  products: Product[]
  fulfilment: 'pickup' | 'delivery' | 'both'
  deliveryFee: number
  pickupNote: string | null
  heroImageUrl?: string | null
}

/**
 * grid — 2-col photo-forward cards (spec §8.2). Uses product-shot images
 * when present; the underlying row's muted placeholder handles the empty
 * case. One calm list beats a grid of chips.
 */
export function GridArchetype({
  products,
  fulfilment,
  deliveryFee,
  pickupNote,
}: ArchetypeProps) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {products.map((product, index) => (
        <li
          key={product.id}
          className="animate-rise"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <ProductRow
            product={product}
            fulfilment={fulfilment}
            deliveryFee={deliveryFee}
            pickupNote={pickupNote}
          />
        </li>
      ))}
    </ul>
  )
}