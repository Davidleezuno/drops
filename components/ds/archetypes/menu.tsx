import Image from 'next/image'

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
 * menu — current list layout + optional hero band (spec §8.2). F&B default.
 * Composes existing ds pieces only; identity chrome never reads trust colors.
 */
export function MenuArchetype({
  theme,
  products,
  fulfilment,
  deliveryFee,
  pickupNote,
  heroImageUrl,
}: ArchetypeProps) {
  const hero =
    theme.hero.source === 'upload-crop' && heroImageUrl
      ? {
          url: heroImageUrl,
          crop: theme.hero.crop,
        }
      : null

  const objectPosition = hero?.crop
    ? `${Math.round(hero.crop.x * 100)}% ${Math.round(hero.crop.y * 100)}%`
    : '50% 50%'

  return (
    <>
      {hero && (
        <div className="relative mb-6 aspect-[16/7] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={hero.url}
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition }}
            sizes="(max-width: 448px) 100vw, 448px"
            priority
          />
        </div>
      )}

      <ul className="flex flex-col gap-3">
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
    </>
  )
}