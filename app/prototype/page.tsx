import type { Metadata } from 'next'

import { createServiceClient } from '@/lib/db'
import { storefrontThemeSchema } from '@/lib/drop-builder'
import type { Product } from '@/lib/types'

import { DEFAULT_VARIANT } from './data'
import type { ProtoSeller } from './data'
import { PrototypeApp } from './prototype-app'

export const metadata: Metadata = {
  title: 'Drops — storefront prototype',
}

export const dynamic = 'force-dynamic'

const DEFAULT_STORE = { seller: 'merch', drop: 'drops' }

type PrototypeDropRow = {
  id: string
  seller_name: string
  seller_slug: string
  drop_slug: string
  theme: unknown
}

async function loadStore(sellerSlug: string, dropSlug: string): Promise<ProtoSeller | null> {
  const supabase = createServiceClient()
  const { data: drop, error: dropError } = await supabase
    .from('drops')
    .select('id, seller_name, seller_slug, drop_slug, theme')
    .eq('seller_slug', sellerSlug)
    .eq('drop_slug', dropSlug)
    .maybeSingle<PrototypeDropRow>()

  if (dropError) throw dropError
  if (!drop) return null

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('drop_id', drop.id)
    .order('price', { ascending: false })
    .returns<Product[]>()

  if (productsError) throw productsError
  if (!products?.length) return null

  const parsedTheme = storefrontThemeSchema.safeParse(drop.theme)
  const voice = parsedTheme.success ? parsedTheme.data.voice : null

  const chosenProducts = Array.from(
    { length: Math.min(5, Math.max(1, products.length)) },
    (_, index) => products[index % products.length],
  )
  while (chosenProducts.length < 3) {
    chosenProducts.push(products[chosenProducts.length % products.length])
  }

  return {
    name: drop.seller_name,
    dropTitle: voice?.dropTitle ?? drop.drop_slug.replaceAll('-', ' '),
    tagline: voice?.sellerNote ?? 'A small release, arranged on the front table.',
    accent: '#73806a',
    vertical: parsedTheme.success ? parsedTheme.data.vertical : 'other',
    href: `/${drop.seller_slug}/${drop.drop_slug}`,
    products: chosenProducts.map((product) => {
      const left = product.stock_total === null
        ? null
        : Math.max(0, product.stock_total - product.stock_sold)
      return {
        id: product.id,
        name: product.name,
        variant: product.variant,
        price: product.price,
        left,
        soldOut: left === 0,
        image: product.image_url ?? '/prototype/linen-square.jpg',
      }
    }),
  }
}

/** PROTOTYPE route: /prototype?variant=shophouse|front-room|conservatory */
export default async function PrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string; seller?: string; drop?: string }>
}) {
  const {
    variant = DEFAULT_VARIANT,
    seller = DEFAULT_STORE.seller,
    drop = DEFAULT_STORE.drop,
  } = await searchParams
  const [store, foodStore] = await Promise.all([
    loadStore(seller, drop),
    loadStore('rotiwife', 'tonight'),
  ])
  return <PrototypeApp variantKey={variant} store={store} foodStore={foodStore} />
}
