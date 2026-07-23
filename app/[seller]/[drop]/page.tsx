import { notFound } from 'next/navigation'

import { Shell } from '@/components/ds/shell'
import { createServiceClient } from '@/lib/db'
import { dropWindowClosed } from '@/lib/drop-state'
import { storefrontThemeSchema } from '@/lib/drop-builder'
import { storefrontScopeVars } from '@/lib/theme'
import { firstNameOnly, type Appreciation } from '@/lib/social-events'
import type { Product, StorefrontTheme } from '@/lib/types'
import { buildSceneConfig } from '@/lib/world/scene-config'

import { DropStorefront, type StorefrontDrop } from './drop-storefront'

export const dynamic = 'force-dynamic'

type DropRow = StorefrontDrop & { theme: unknown }

type AppreciationRow = {
  buyer_name: string
  buyer_note: string
  buyer_note_at: string
  product: { name: string } | null
}

function parseTheme(theme: unknown): StorefrontTheme | null {
  if (!theme) return null
  const parsed = storefrontThemeSchema.safeParse(theme)
  return parsed.success ? parsed.data : null
}

export default async function DropPage({
  params,
}: {
  params: Promise<{ seller: string; drop: string }>
}) {
  const { seller, drop: dropSlug } = await params
  const supabase = createServiceClient()

  const { data: drop } = await supabase
    .from('drops')
    .select(
      'id, seller_name, seller_slug, drop_slug, fulfilment, delivery_fee, pickup_note, window_ends_at, status, theme',
    )
    .eq('seller_slug', seller)
    .eq('drop_slug', dropSlug)
    .maybeSingle<DropRow>()

  if (!drop) notFound()

  const theme = parseTheme(drop.theme)
  const themedDrop: StorefrontDrop = { ...drop, theme }

  const { data: products } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('drop_id', drop.id)
    .order('price', { ascending: false })
    .returns<Product[]>()

  const { data: appreciationRows } = await supabase
    .from('orders')
    .select('buyer_name, buyer_note, buyer_note_at, product:products!inner(name, drop_id)')
    .eq('product.drop_id', drop.id)
    .eq('status', 'PAID')
    .not('buyer_note', 'is', null)
    .order('buyer_note_at', { ascending: false })
    .limit(12)
    .returns<AppreciationRow[]>()

  const initialAppreciations: Appreciation[] = (appreciationRows ?? [])
    .filter((row) => row.buyer_note && row.buyer_note_at && row.product)
    .map((row) => ({
      id: row.buyer_note_at,
      firstName: firstNameOnly(row.buyer_name),
      productName: row.product!.name,
      note: row.buyer_note,
    }))

  const initialEnded = dropWindowClosed(drop)
  const sceneConfig = buildSceneConfig(products ?? [], theme, drop.seller_name)

  const storefront = (
    <DropStorefront
      drop={themedDrop}
      initialProducts={products ?? []}
      initialEnded={initialEnded}
      sceneConfig={sceneConfig}
      initialAppreciations={initialAppreciations}
    />
  )

  const footer = (
    <footer className="mt-auto pt-12 text-center">
      <p className="font-mono text-xs text-muted-foreground/60">
        a <span className="font-display text-sm font-semibold">Drops</span>{' '}
        storefront
      </p>
    </footer>
  )

  if (!theme) {
    // theme = null → today's buyer page, pixel-for-pixel.
    return (
      <Shell>
        {storefront}
        {footer}
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={storefrontScopeVars(theme) as React.CSSProperties}>
        {storefront}
      </div>
      {footer}
    </Shell>
  )
}
