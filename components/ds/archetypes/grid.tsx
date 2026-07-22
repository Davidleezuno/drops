import { ProductGridCard } from '@/components/ds/product-grid-card'
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
 * grid — a familiar two-column, photo-first mobile catalogue. Product option
 * details stay in checkout so the listing remains tidy and easy to scan.
 */
export function GridArchetype({
  products,
  fulfilment,
  deliveryFee,
  pickupNote,
}: ArchetypeProps) {
  return (
    <ul className="grid grid-cols-2 items-stretch gap-x-3 gap-y-8">
      {products.map((product, index) => (
        <li
          key={product.id}
          className="animate-rise"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <ProductGridCard
            product={product}
            fulfilment={fulfilment}
            deliveryFee={deliveryFee}
            pickupNote={pickupNote}
            priority={index < 2}
          />
        </li>
      ))}
    </ul>
  )
}
