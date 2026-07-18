import { MapPin, Truck } from 'lucide-react'
import { notFound } from 'next/navigation'

import { DropHeader } from '@/components/ds/drop-header'
import { LivePill } from '@/components/ds/live-pill'
import { Poster } from '@/components/ds/poster'
import { ProductRow } from '@/components/ds/product-row'
import { Shell } from '@/components/ds/shell'
import { createServiceClient } from '@/lib/db'
import { sgd } from '@/lib/format'
import type { Drop, Product } from '@/lib/types'

import { Countdown } from './countdown'

export const dynamic = 'force-dynamic'

export default async function DropPage({
  params,
}: {
  params: Promise<{ seller: string; drop: string }>
}) {
  const { seller, drop: dropSlug } = await params
  const supabase = createServiceClient()

  const { data: drop } = await supabase
    .from('drops')
    .select('*')
    .eq('seller_slug', seller)
    .eq('drop_slug', dropSlug)
    .maybeSingle<Drop>()

  if (!drop) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('drop_id', drop.id)
    .order('price', { ascending: false })
    .returns<Product[]>()

  const ended =
    drop.status === 'ended' || new Date(drop.window_ends_at) <= new Date()
  const allSoldOut =
    (products ?? []).length > 0 &&
    (products ?? []).every((p) => p.stock_total - p.stock_sold <= 0)

  return (
    <Shell>
      <DropHeader
        sellerName={drop.seller_name}
        sellerSlug={drop.seller_slug}
        dropSlug={drop.drop_slug}
        className="mb-8"
      >
        {!ended && (
          <LivePill>
            <Countdown endsAt={drop.window_ends_at} />
          </LivePill>
        )}
      </DropHeader>

      {ended ? (
        <Poster variant="ended" title="This drop has ended" className="flex-1">
          The window has closed. Follow {drop.seller_name} for the next one.
        </Poster>
      ) : (
        <>
          {allSoldOut && (
            <Poster variant="sold-out" title="Sold out" className="mb-6 py-12">
              Everything&rsquo;s gone. Follow {drop.seller_name} for the next
              drop.
            </Poster>
          )}

          <ul className="flex flex-col gap-3">
            {(products ?? []).map((product, i) => (
              <li
                key={product.id}
                className="animate-rise"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <ProductRow product={product} />
              </li>
            ))}
          </ul>

          <section className="mt-8">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Getting it
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

      <footer className="mt-auto pt-12 text-center">
        <p className="font-mono text-xs text-muted-foreground/60">
          a <span className="font-display text-sm italic">Drops</span>{' '}
          storefront
        </p>
      </footer>
    </Shell>
  )
}
