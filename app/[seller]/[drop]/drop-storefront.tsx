'use client'

import { MapPin, Truck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ArchetypeLayout } from '@/components/ds/archetypes'
import { DropHeader } from '@/components/ds/drop-header'
import { LivePill } from '@/components/ds/live-pill'
import { Poster } from '@/components/ds/poster'
import { ProductRow } from '@/components/ds/product-row'
import { ReactionLayer } from '@/components/ds/reaction-layer'
import { SocialToast } from '@/components/ds/social-toast'
import { WatchingPill } from '@/components/ds/watching-pill'
import { allSoldOut as computeAllSoldOut } from '@/lib/drop-state'
import { sgd } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import type { Drop, Product } from '@/lib/types'
import { useDropSocial } from '@/lib/use-drop-social'

import { Countdown } from './countdown'

const POLL_INTERVAL_MS = 5_000

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

function mergeProduct(current: Product, incoming: Product) {
  return {
    ...current,
    ...incoming,
    // The payment settlement function is the only stock writer, and stock_sold
    // only increases. Keep a slower poll response from undoing a newer event.
    stock_sold: Math.max(current.stock_sold, incoming.stock_sold),
  }
}

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
}: {
  drop: StorefrontDrop
  initialProducts: Product[]
  initialEnded: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [products, setProducts] = useState(initialProducts)
  const [windowClosed, setWindowClosed] = useState(initialEnded)
  const social = useDropSocial(supabase, drop.id)

  const allSoldOut = computeAllSoldOut(products)

  const closeWindow = useCallback(() => setWindowClosed(true), [])

  useEffect(() => {
    if (windowClosed || allSoldOut) return

    let active = true

    async function refreshProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('drop_id', drop.id)
        .order('price', { ascending: false })
        .returns<Product[]>()

      if (!active) return
      if (error) {
        console.error('Failed to refresh drop stock', error)
        return
      }

      setProducts((current) =>
        current.map((product) => {
          const incoming = data.find((candidate) => candidate.id === product.id)
          return incoming ? mergeProduct(product, incoming) : product
        }),
      )
    }

    const channel = supabase
      .channel(`drop-${drop.id}-products`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `drop_id=eq.${drop.id}`,
        },
        (payload) => {
          const incoming = payload.new as Product
          if (incoming.drop_id !== drop.id) return

          setProducts((current) =>
            current.map((product) =>
              product.id === incoming.id
                ? mergeProduct(product, incoming)
                : product,
            ),
          )
        },
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          // Reconcile the gap between the server render and channel readiness.
          void refreshProducts()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Drop stock realtime subscription failed', error)
        }
      })

    const poller = window.setInterval(refreshProducts, POLL_INTERVAL_MS)
    const refreshOnFocus = () => void refreshProducts()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshProducts()
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      active = false
      window.clearInterval(poller)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      void supabase.removeChannel(channel)
    }
  }, [allSoldOut, drop.id, supabase, windowClosed])

  return (
    <>
      <DropHeader
        sellerName={drop.seller_name}
        sellerSlug={drop.seller_slug}
        dropSlug={drop.drop_slug}
        className="mb-8"
      >
        {!windowClosed && drop.window_ends_at && (
          <LivePill>
            <Countdown endsAt={drop.window_ends_at} onEnd={closeWindow} />
          </LivePill>
        )}
        <WatchingPill count={social.watching} />
      </DropHeader>

      {/* Social overlays serve the race; the ended poster gets silence. */}
      {!windowClosed && (
        <>
          <SocialToast announcement={social.announcement} />
          <ReactionLayer
            subscribe={social.subscribeToReactions}
            react={social.react}
          />
        </>
      )}

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
}
