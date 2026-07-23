'use client'

import { MapPin, Truck } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { ArchetypeLayout } from '@/components/ds/archetypes'
import { DropHeader } from '@/components/ds/drop-header'
import { LivePill } from '@/components/ds/live-pill'
import { Poster } from '@/components/ds/poster'
import { ProductRow } from '@/components/ds/product-row'
import { SocialToast } from '@/components/ds/social-toast'
import { WatchingPill } from '@/components/ds/watching-pill'
import { WorldGate } from '@/components/world/world-gate'
import { allSoldOut as computeAllSoldOut } from '@/lib/drop-state'
import { sgd } from '@/lib/format'
import type { Appreciation } from '@/lib/social-events'
import { createClient } from '@/lib/supabase/client'
import type { Drop, Product } from '@/lib/types'
import { useDropSocial } from '@/lib/use-drop-social'
import { useLiveDropProducts } from '@/lib/use-live-drop-products'
import type { SceneConfig } from '@/lib/world/scene-config'

import { Countdown } from './countdown'

export type StorefrontDrop = Pick<
  Drop,
  | 'id'
  | 'seller_name'
  | 'seller_slug'
  | 'drop_slug'
  | 'fulfilment'
  | 'delivery_fee'
  | 'pickup_note'
  | 'window_ends_at'
  | 'status'
  | 'theme'
>

/** The buyer page only has product image URLs; pick the one that best matches
 *  the hero's sourceImageIndex, falling back to the first product with a shot. */
function heroImageUrlFor(
  theme: NonNullable<StorefrontDrop['theme']>,
  products: Product[],
): string | null {
  if (theme.hero.source !== 'upload-crop') return null
  const targetIndex = theme.hero.sourceImageIndex ?? 0
  return (
    products.find((product, index) => index === targetIndex && product.image_url)
      ?.image_url ??
    products.find((product) => product.image_url)?.image_url ??
    null
  )
}

export function DropStorefront({
  drop,
  initialProducts,
  initialEnded,
  sceneConfig,
  initialAppreciations,
}: {
  drop: StorefrontDrop
  initialProducts: Product[]
  initialEnded: boolean
  sceneConfig: SceneConfig | null
  initialAppreciations: Appreciation[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [windowClosed, setWindowClosed] = useState(initialEnded)
  const social = useDropSocial(supabase, drop.id, { initialAppreciations })
  const products = useLiveDropProducts({
    supabase,
    dropId: drop.id,
    initialProducts,
    paused: windowClosed,
    onPaidStockChange: social.announcePaid,
  })

  const allSoldOut = computeAllSoldOut(products)

  const closeWindow = useCallback(() => setWindowClosed(true), [])

  const fallback = (
    <>
      <DropHeader
        sellerName={drop.seller_name}
        sellerSlug={drop.seller_slug}
        dropSlug={drop.drop_slug}
        className="mb-8"
      >
        {!windowClosed && drop.window_ends_at && (
          <LivePill className="gap-1.5 rounded-none bg-transparent p-0 text-[11px] text-muted-foreground">
            <Countdown endsAt={drop.window_ends_at} onEnd={closeWindow} />
          </LivePill>
        )}
        <WatchingPill
          count={social.watching}
          className="rounded-none bg-transparent p-0 text-[11px] text-muted-foreground"
        />
      </DropHeader>

      {!windowClosed && <SocialToast announcement={social.announcement} />}

      {windowClosed ? (
        <Poster variant="ended" title="This drop has ended" className="flex-1">
          The window closed. Follow {drop.seller_name} for the next one.
        </Poster>
      ) : allSoldOut ? (
        <Poster
          variant="sold-out"
          title="Sold out"
          className="flex-1 py-12 sm:min-h-[50vh]"
        >
          Everything&rsquo;s gone. Follow {drop.seller_name} for the next drop.
        </Poster>
      ) : (
        <>
          {drop.theme ? (
            <ArchetypeLayout
              theme={drop.theme}
              products={products}
              fulfilment={drop.fulfilment}
              deliveryFee={drop.delivery_fee}
              pickupNote={drop.pickup_note}
              heroImageUrl={heroImageUrlFor(drop.theme, products)}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {products.map((product, index) => (
                <li
                  key={product.id}
                  className="animate-rise"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <ProductRow
                    product={product}
                    fulfilment={drop.fulfilment}
                    deliveryFee={drop.delivery_fee}
                    pickupNote={drop.pickup_note}
                  />
                </li>
              ))}
            </ul>
          )}

          <section className="mt-8">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              How you get it
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              {(drop.fulfilment === 'delivery' || drop.fulfilment === 'both') && (
                <li className="flex items-center gap-2.5">
                  <Truck className="size-4 shrink-0 text-muted-foreground" />
                  <span>
                    Delivery ·{' '}
                    <span className="font-mono font-medium tabular-nums">
                      {sgd.format(drop.delivery_fee)}
                    </span>{' '}
                    fee
                  </span>
                </li>
              )}
              {(drop.fulfilment === 'pickup' || drop.fulfilment === 'both') &&
                drop.pickup_note && (
                  <li className="flex items-center gap-2.5">
                    <MapPin className="size-4 shrink-0 text-muted-foreground" />
                    <span>Pickup · {drop.pickup_note}</span>
                  </li>
                )}
            </ul>
          </section>
        </>
      )}
    </>
  )

  return (
    <WorldGate
      config={sceneConfig}
      fallback={fallback}
      drop={drop}
      products={products}
      windowClosed={windowClosed}
      announcement={social.announcement}
      appreciations={social.appreciations}
      socialPresenceKey={social.presenceKey}
    />
  )
}
